import { PoolConnection, FieldPacket, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { 
    publicClientETH,
    publicClientBSC,
    publicClientARBITRUM,
    publicClientFTM,
    publicClientOPTIMISM,
    publicClientPOLYGON
 } from './client';
import { pool } from './dbPromise';
import { logger } from './logger';
import { parseAbi, PublicClient } from 'viem';
import { Address } from 'viem';
import express, { Express, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

interface EventsData extends RowDataPacket {
    id: number;
    address: string;
    chain: string;
    lastBlock: bigint;
}

interface InsertResult extends ResultSetHeader {

};

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
    'fantom': publicClientFTM,
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
        logger.error(error);
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
        logger.error(error);
        res.status(500).send('An error occurred while processing logs.');
    }
});

//correct the type errors below

async function processLogs(address: Address, chain: string) {
    const lastBlockQuery = `SELECT lastBlock FROM events_tracker WHERE address = ? and chain = ?;`;
    const updateBlockQuery = `UPDATE events_tracker SET lastBlock = ? WHERE address = ? AND chain = ?`;
    const publicClient: PublicClient = clients[chain as keyof Client];

    let lastBlock: bigint | undefined;

    let connection: PoolConnection | undefined;
    try {
        // Get a connection from the pool
        connection = await pool.getConnection();

        // Check if the combination of address and chain already exists in the database
        const checkExistenceQuery = `SELECT COUNT(*) as count FROM events_tracker WHERE address = ? AND chain = ?`;
        const [rows]: [EventsData[], FieldPacket[]] = await connection.execute(checkExistenceQuery, [address, chain]);
        const rowCount: number = rows[0].count;

        if (rowCount === 0) {
            try {
                lastBlock = await publicClient.getBlockNumber();
                
                // Insert the address and chain into the database if they don't exist
                const insertAddressQuery = `INSERT INTO events_tracker (address, chain, lastBlock) VALUES (?, ?, ?)`;
                const insertResult: any = await connection.execute(insertAddressQuery, [address, chain, lastBlock]);
                if (insertResult.insertId) {
                    logger.info(`Inserted new record for address '${address}' on chain '${chain}'.`);
                }
            } catch (error) {
                logger.error(error);
            }
        } else {
            // Retrieve the lastBlock value from the database
            const [selectResult]: [EventsData[], FieldPacket[]] = await connection.execute(lastBlockQuery, [address, chain]);
            lastBlock = BigInt(selectResult[0]?.lastBlock);
        }
    } catch (err) {
        logger.error(err);
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }

    if (lastBlock === undefined) {
        return; // Handle error or exit if lastBlock is undefined
    }

    // Rest of the processLogs function remains the same
    const getLogs = async () => {
        try {
            const currentBlock = await publicClient.getBlockNumber();
            //@ts-ignore
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
                await updateLastBlockInDatabase(currentBlock, address, chain);
                lastBlock = currentBlock;
            }
        } catch (error) {
            logger.error(`Error while processing logs for chain '${chain}': ${error}`);
        }
    }

    const interval = setInterval(getLogs, pollInterval);

    // Stop the interval after a specific number of polls or time
    setTimeout(() => {
        clearInterval(interval);
        console.log(`Stopped polling`);
    }, 1000000); // Adjust the time as needed
}


async function updateLastBlockInDatabase(newBlock: bigint, address: Address, chain: string) {
    try {
        const connection = await pool.getConnection();
        const updateBlockQuery = `UPDATE events_tracker SET lastBlock = ? WHERE address = ? AND chain = ?`;
        const [updateResult]: [ResultSetHeader, FieldPacket[]] = await connection.execute(updateBlockQuery, [newBlock, address, chain]);
        connection.release();

        if (updateResult.affectedRows === 1) {
            logger.info(`Updated lastBlock for address '${address}' on chain '${chain}' to ${newBlock}.`);
        }
    } catch (error) {
        logger.error(`Error updating lastBlock in database: ${error}`);
    }
}


//Send request to external api
async function makeApiCall() {
    const response = await axios.get("https://swapi.dev/api/people/1")
}

function main() {
    app.listen(port, () => {
        console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });

}

main();