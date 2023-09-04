import { 
    publicClientETH,
    publicClientBSC,
    publicClientARBITRUM,
    publicClientFTM,
    publicClientOPTIMISM,
    publicClientPOLYGON
 } from './client';
import { parseAbi, PublicClient } from 'viem';
import { Address } from 'viem';
import express, { Express, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

type Client = {
    mainnet: PublicClient;
    bsc: PublicClient;
    polygon: PublicClient;
    arbitrum: PublicClient;
    fantom: PublicClient;
};

const clients: Client = {
    'mainnet': publicClientETH,
    'bsc': publicClientBSC,
    'polygon': publicClientPOLYGON,
    'arbitrum': publicClientARBITRUM,
    'fantom': publicClientFTM
};

const pollInterval = 15000;
const supportedChains = Object.keys(clients);

app.get('/add', async (req: Request, res: Response) => {
    const { address, chain } = req.query as { address: Address, chain: string };

    if (!supportedChains.includes(chain)) {
        res.status(400).send(`Chain '${chain}' is not supported.`);
        return;
    }

    try {
        await processLogs(address, chain);
        res.send(`Monitoring ${address} on chain ${chain}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing logs.');
    }
});

app.get('/addAllChains', async (req: Request, res: Response) => {
    const { address } = req.query as { address: Address };

    try {
        for (const chain of supportedChains) {
            await processLogs(address, chain);
        }
        res.send(`Monitoring ${address} on supported chains`);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing logs.');
    }
});

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

async function processLogs(address: Address, chain: string) {
    const publicClient: PublicClient = clients[chain as keyof Client];
    let lastBlock: bigint;

    try {
        lastBlock = await publicClient.getBlockNumber();
    } catch (error) {
        throw new Error(`Error getting last block number for chain '${chain}': ${error}`);
    }

    const getLogs = async () => {
        try {
            const currentBlock = await publicClient.getBlockNumber();
            if (currentBlock > lastBlock) {
                const logs = await publicClient.getLogs({
                    address: address,
                    events: parseAbi([ 
                        'event Approval(address indexed owner, address indexed sender, uint256 value)',
                        'event Transfer(address indexed from, address indexed to, uint256 value)',
                    ]),
                    fromBlock: lastBlock,
                    toBlock: currentBlock,
                });

                if (Array.isArray(logs)) {
                    logs.forEach(element => {
                        console.log(element);
                        // Make your API call here if needed
                    });
                }
                lastBlock = currentBlock;
            }
        } catch (error) {
            console.error(`Error while processing logs for chain '${chain}': ${error}`);
        }
    };

    const interval = setInterval(getLogs, pollInterval);

    // Stop the interval after a specific number of polls or time
    setTimeout(() => {
        clearInterval(interval);
        console.log(`Stopped polling for chain '${chain}'`);
    }, 1000000); // Adjust the time as needed
}


//Send request to external api
async function makeApiCall() {
    const response = await axios.get("https://swapi.dev/api/people/1")
}