// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/AutomationCompatible.sol';

error Raffle__SendMoreToEnterRaffle();
error Raffle__RaffleNotOpen();
error Raffle__TransferFailed();
error Raffle__UpkeepNotNeeded(
   uint256 currentBalance,
   uint256 numPlayers,
   uint256 raffleState
);

contract Raffle is VRFConsumerBaseV2, AutomationCompatible {
   enum RaffleState {
      OPEN,
      CALCULATING
   }

   VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
   bytes32 private immutable i_gasLane;
   uint64 private immutable i_subscriptionId;
   uint16 private immutable i_requestConfirmations;
   uint32 private immutable i_callbackGasLimit;
   uint32 private constant NUM_WORDS = 1;

   address payable[] private s_players;
   address private s_recentWinner;
   uint256 private s_lastTimeStamp;
   RaffleState private s_raffleState;
   uint256 private immutable i_entranceFee;
   uint256 private immutable i_interval;

   event RaffleEnter(address indexed player);
   event RequestRaffleWinner(uint256 indexed requestId);
   event WinnerPicked(address indexed winner);

   constructor(
      address vrfCoordinatorV2Address,
      uint64 subscriptionId,
      bytes32 gasLane,
      uint16 requestConfirmations,
      uint32 callbackGasLimit,
      uint256 entranceFee,
      uint256 interval
   ) VRFConsumerBaseV2(vrfCoordinatorV2Address) {
      i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(vrfCoordinatorV2Address);
      i_subscriptionId = subscriptionId;
      i_gasLane = gasLane;
      i_requestConfirmations = requestConfirmations;
      i_callbackGasLimit = callbackGasLimit;
      i_entranceFee = entranceFee;
      i_interval = interval;
      s_lastTimeStamp = block.timestamp;
   }

   function enterRaffle() public payable {
      if (msg.value < i_entranceFee) {
         revert Raffle__SendMoreToEnterRaffle();
      }
      if (s_raffleState != RaffleState.OPEN) {
         revert Raffle__RaffleNotOpen();
      }

      s_players.push(payable(msg.sender));
      emit RaffleEnter(msg.sender);
   }

   function checkUpkeep(
      bytes memory
   ) public view override returns (bool upkeepNeeded, bytes memory) {
      bool isOpen = s_raffleState == RaffleState.OPEN;
      bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
      bool hasPlayers = s_players.length > 0;
      bool hasBalance = address(this).balance > 0;
      upkeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
      return (upkeepNeeded, '0x0');
   }

   function performUpkeep(bytes calldata) external override {
      (bool upkeepNeeded, ) = checkUpkeep('');

      if (!upkeepNeeded) {
         revert Raffle__UpkeepNotNeeded(
            address(this).balance,
            s_players.length,
            uint256(s_raffleState)
         );
      }

      s_raffleState = RaffleState.CALCULATING;

      uint256 requestId = i_vrfCoordinatorV2.requestRandomWords(
         i_gasLane,
         i_subscriptionId,
         i_requestConfirmations,
         i_callbackGasLimit,
         NUM_WORDS
      );

      emit RequestRaffleWinner(requestId);
   }

   function fulfillRandomWords(
      uint256,
      uint256[] memory randomWords
   ) internal override {
      address payable[] memory players = s_players;
      uint256 winnerIndex = randomWords[0] % players.length;
      address payable winner = players[winnerIndex];
      s_recentWinner = winner;
      s_players = new address payable[](0);
      s_lastTimeStamp = block.timestamp;
      s_raffleState = RaffleState.OPEN;

      (bool success, ) = winner.call{value: address(this).balance}('');
      if (!success) {
         revert Raffle__TransferFailed();
      }

      emit WinnerPicked(winner);
   }

   function getRaffleState() public view returns (RaffleState) {
      return s_raffleState;
   }

   function getRequestConfirmations() public view returns (uint256) {
      return i_requestConfirmations;
   }

   function getRecentWinner() public view returns (address) {
      return s_recentWinner;
   }

   function getPlayer(uint256 index) public view returns (address) {
      return s_players[index];
   }

   function getLastTimeStamp() public view returns (uint256) {
      return s_lastTimeStamp;
   }

   function getInterval() public view returns (uint256) {
      return i_interval;
   }

   function getEntranceFee() public view returns (uint256) {
      return i_entranceFee;
   }

   function getNumberOfPlayers() public view returns (uint256) {
      return s_players.length;
   }

   function getNumWords() public pure returns (uint256) {
      return NUM_WORDS;
   }
}
