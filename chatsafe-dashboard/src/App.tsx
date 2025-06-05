import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './index.css'; // Ensure Tailwind is imported

// --- Smart Contract Configuration (Placeholders) ---
// TODO: Replace with your deployed contract address and ABI
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE"; // e.g., "0x..."
const CONTRACT_ABI: ethers.InterfaceAbi = [
  // Simplified ABI - expand with all functions and events from ChatSafe.sol
  "event MessageFlagged(address offender, string reason)",
  "function logFlag(address offender, string memory reason) external",
  "function getReports() public view returns (tuple(address offender, string reason, uint256 timestamp)[] memory)",
  "function reputation(address) public view returns (uint256)"
  // Add other functions/events if your App.tsx interacts with them
];

// Type for our Report structure based on the contract
type ReportStruct = {
  offender: string;
  reason: string;
  timestamp: ethers.BigNumberish; // Smart contract returns BigNumber for uint256
};

type Report = {
  id: string; // Using timestamp + offender as a pseudo-ID
  offender: string;
  reason:string;
  timestamp: string; // Display-friendly format
};

const App: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setError(null);
    if (typeof window.ethereum !== 'undefined') {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        await web3Provider.send("eth_requestAccounts", []); // Request account access
        const signer = await web3Provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(web3Provider);
        setWalletAddress(address);

        // Initialize contract instance
        if (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") {
          console.warn("Contract address is a placeholder. Real interactions will fail.");
          setError("Contract address not configured. Please deploy your contract and update the address.");
        }
        const chatSafeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(chatSafeContract);

        console.log("Wallet connected:", address);
      } catch (err: any) {
        console.error("Error connecting wallet:", err);
        setError(err.message || "Failed to connect wallet. Make sure MetaMask is installed and unlocked.");
      }
    } else {
      setError("MetaMask is not installed. Please install MetaMask to use this dApp.");
      console.log('MetaMask is not installed!');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setProvider(null);
    setContract(null);
    setReports([]); // Clear reports on disconnect
    console.log("Wallet disconnected");
  };

  const fetchReports = useCallback(async () => {
    if (!contract && CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE") {
      // If contract is not initialized but address is set, try to initialize read-only
      if (provider) {
         const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
         setContract(readOnlyContract); // Set it for future use if signer becomes available
      } else if (typeof window.ethereum !== 'undefined') {
        // Fallback to a generic provider if no wallet connected yet, for public view
        const genericProvider = new ethers.BrowserProvider(window.ethereum);
        const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, genericProvider);
        setContract(readOnlyContract); // This allows viewing reports without connecting wallet
         console.log("Fetching reports with a read-only instance.");
      } else {
        setError("MetaMask is not installed. Cannot fetch reports.");
        return;
      }
    }
    
    // Re-check contract after potential initialization above
    if (!contract && !(CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE" && (provider || typeof window.ethereum !== 'undefined'))) {
        if (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") {
            setError("Contract address not set. Cannot fetch reports.");
        } else {
            setError("Wallet not connected or provider not available. Please connect wallet to fetch reports.");
        }
        return;
    }


    setIsLoading(true);
    setError(null);
    console.log("Fetching reports...");

    // Use a temporary contract instance for fetching if the main one isn't ready or isn't signed
    let contractToUse = contract;
    if (!contractToUse?.runner) { // If contract doesn't have a signer (e.g. read-only mode)
        const currentProvider = provider || (typeof window.ethereum !== 'undefined' ? new ethers.BrowserProvider(window.ethereum) : null);
        if (currentProvider && CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE") {
            contractToUse = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentProvider);
        } else {
            setError("Cannot fetch reports: Provider not available or contract address missing.");
            setIsLoading(false);
            return;
        }
    }


    try {
      // Ensure contractToUse is defined before calling methods on it
      if (!contractToUse) {
          throw new Error("Contract instance is not available.");
      }
      const rawReports: ReportStruct[] = await contractToUse.getReports();
      const formattedReports: Report[] = rawReports.map((report, index) => ({
        id: `${ethers.toNumber(report.timestamp)}-${report.offender}-${index}`, // Create a more unique ID
        offender: report.offender,
        reason: report.reason,
        timestamp: new Date(ethers.toNumber(report.timestamp) * 1000).toLocaleString(),
      })).reverse(); // Show newest reports first
      setReports(formattedReports);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to fetch reports. Check contract address and network.");
      // If it's a common contract error, provide more specific feedback
      if (err.message && err.message.includes("call revert exception")) {
          setError("Failed to fetch reports. The contract might not be deployed at the specified address on the current network, or the ABI is incorrect.");
      }
      setReports([]); // Clear reports on error
    } finally {
      setIsLoading(false);
    }
  }, [contract, provider]); // Dependencies for useCallback

  const logTestReport = async () => {
    if (!contract || !contract.runner) { // Check if contract is initialized and has a signer
      setError("Please connect your wallet first to log a report.");
      console.error("Cannot log report: contract not initialized or no signer.");
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("Logging a test report...");
    try {
      // For testing, using the connected wallet as the offender
      const offenderAddress = walletAddress || "0x000000000000000000000000000000000000dEaD"; // Fallback if walletAddress is somehow null
      const reason = "Test infraction from dashboard";
      
      const tx = await contract.logFlag(offenderAddress, reason);
      await tx.wait(); // Wait for the transaction to be mined
      
      alert("Test report logged successfully! Transaction hash: " + tx.hash);
      fetchReports(); // Refresh reports after logging
    } catch (err: any) {
      console.error("Error logging test report:", err);
      setError(err.message || "Failed to log test report.");
      if (err.message && err.message.includes("user rejected transaction")) {
          setError("Transaction rejected by user.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to fetch reports when contract is initialized or wallet connects (for signed contract)
  useEffect(() => {
    if (CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE") {
        // Attempt to fetch reports on initial load (read-only if wallet not connected)
        // or when contract instance becomes available after wallet connection.
        fetchReports();
    }
  }, [fetchReports]); // fetchReports is memoized with useCallback

  // Listen for Metamask account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // MetaMask is locked or the user has disconnected all accounts
          console.log('Please connect to MetaMask.');
          disconnectWallet();
        } else if (accounts[0] !== walletAddress) {
          // Account has changed
          console.log('Account changed to:', accounts[0]);
          // Re-connect with the new account. This will re-initialize the contract with the new signer.
          connectWallet();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Recommended to also listen for chainChanged
      // window.ethereum.on('chainChanged', (_chainId) => window.location.reload());

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletAddress]); // Re-run if walletAddress changes


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-400">ChatSafe Admin Dashboard</h1>
      </header>

      <section className="mb-8 flex flex-col items-center space-y-4">
        {walletAddress ? (
          <>
            <p className="text-md sm:text-lg text-center">Connected: <span className="font-mono bg-gray-700 px-2 py-1 rounded block sm:inline-block break-all">{walletAddress}</span></p>
            <button
              onClick={disconnectWallet}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
              Disconnect Wallet
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition duration-150 ease-in-out text-xl"
          >
            Connect MetaMask
          </button>
        )}
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      </section>

      <main>
        <div className="bg-gray-800 shadow-2xl rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-semibold text-sky-300">Flagged Reports</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchReports}
                disabled={isLoading || (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE")}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && reports.length === 0 ? 'Refreshing...' : 'Refresh Reports'}
              </button>
              <button
                onClick={logTestReport}
                disabled={isLoading || !contract || !contract.runner || (CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE")}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Log Test Report
              </button>
            </div>
          </div>

          {isLoading && reports.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Loading reports...</p>
          ) : !isLoading && reports.length === 0 && CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_HERE" && !error ? (
            <p className="text-center text-gray-400 py-4">No reports found. Log a test report or wait for agent activity.</p>
          ) : reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Offender</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-sky-400 break-all">{report.offender}</td>
                      <td className="px-4 py-4 whitespace-normal text-sm text-gray-200 break-words">{report.reason}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">{report.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null } {/* Handles the case where reports is empty but not due to loading or no reports found after fetch */}
           {CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE" && !error && (
             <p className="text-center text-yellow-400 py-4">Contract address not configured. Please deploy the contract and update the address in the source code.</p>
           )}
        </div>
      </main>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ChatSafe. Moderating the decentralized web.</p>
      </footer>
    </div>
  );
};

export default App;
