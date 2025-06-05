// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ChatSafe {
    struct Report {
        address offender;
        string reason;
        uint256 timestamp;
    }

    Report[] public reports;
    mapping(address => uint256) public reputation;

    event MessageFlagged(address offender, string reason);

    function logFlag(address offender, string memory reason) external {
        reports.push(Report(offender, reason, block.timestamp));
        reputation[offender] += 1; // Increment reputation
        emit MessageFlagged(offender, reason);
    }

    function getReports() public view returns (Report[] memory) {
        return reports;
    }

    function getReputation(address user) public view returns (uint256) {
        return reputation[user];
    }
}
