import assert from 'assert';
import DISPERSE_ABI from 'utils/abi/disperse.abi';
import {assertAddress, handleTx, toWagmiProvider} from 'utils/toWagmiProvider';
import {erc20ABI, erc721ABI, getPublicClient, prepareSendTransaction, readContract, sendTransaction, waitForTransaction} from '@wagmi/core';
import {MAX_UINT_256} from '@yearn-finance/web-lib/utils/constants';
import {toBigInt} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {defaultTxStatus} from '@yearn-finance/web-lib/utils/web3/transaction';

import ERC1155_ABI from './abi/ERC1155.abi';
import NFT_MIGRATOOOR_ABI from './abi/NFTMigratooor.abi';

import type {BaseError} from 'viem';
import type {Connector} from 'wagmi';
import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TWriteTransaction} from './toWagmiProvider';

//Because USDT do not return a boolean on approve, we need to use this ABI
const ALTERNATE_ERC20_APPROVE_ABI = [{'constant': false, 'inputs': [{'name': '_spender', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'approve', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}] as const;

/* 🔵 - Yearn Finance **********************************************************
** isApprovedERC20 is a _VIEW_ function that checks if a token is approved for
** a spender.
******************************************************************************/
type TIsApprovedERC20 = {
	connector: Connector | undefined;
	contractAddress: TAddress;
	spenderAddress: TAddress;
	amount?: bigint;
}
export async function isApprovedERC20(props: TIsApprovedERC20): Promise<boolean> {
	const wagmiProvider = await toWagmiProvider(props.connector);
	const result = await readContract({
		...wagmiProvider,
		abi: erc20ABI,
		address: props.contractAddress,
		functionName: 'allowance',
		args: [wagmiProvider.address, props.spenderAddress]
	});
	return (result || 0n) >= toBigInt(props.amount || MAX_UINT_256);
}

/* 🔵 - Yearn Finance **********************************************************
** approveERC20 is a _WRITE_ function that approves a token for a spender.
**
** @param spenderAddress - The address of the spender.
** @param amount - The amount of collateral to deposit.
******************************************************************************/
type TApproveERC20 = TWriteTransaction & {
	spenderAddress: TAddress | undefined;
	amount: bigint;
};
export async function approveERC20(props: TApproveERC20): Promise<TTxResponse> {
	assertAddress(props.spenderAddress, 'spenderAddress');
	assertAddress(props.contractAddress);

	props.onTrySomethingElse = async (): Promise<TTxResponse> => {
		assertAddress(props.spenderAddress, 'spenderAddress');
		return await handleTx(props, {
			address: props.contractAddress,
			abi: ALTERNATE_ERC20_APPROVE_ABI,
			functionName: 'approve',
			args: [props.spenderAddress, props.amount]
		});
	};

	return await handleTx(props, {
		address: props.contractAddress,
		abi: erc20ABI,
		functionName: 'approve',
		args: [props.spenderAddress, props.amount]
	});
}

/* 🔵 - Yearn Finance **********************************************************
** approveAllERC721 is a _WRITE_ function that approves a spender to spend all
** of a user's NFTs.
**
** @param spenderAddress - The address of the spender.
** @param shouldAllow - Whether or not the spender should be allowed to spend
******************************************************************************/
type TApproveAllERC721 = TWriteTransaction & {
	spenderAddress: TAddress | undefined;
	shouldAllow: boolean;
};
export async function approveAllERC721(props: TApproveAllERC721): Promise<TTxResponse> {
	assertAddress(props.spenderAddress, 'spenderAddress');
	assertAddress(props.contractAddress);

	return await handleTx(props, {
		address: props.contractAddress,
		abi: erc721ABI,
		functionName: 'setApprovalForAll',
		args: [props.spenderAddress, props.shouldAllow]
	});
}

/* 🔵 - Yearn Finance **********************************************************
** transferERC721 is a _WRITE_ function that transfers an ERC721 token to a
** recipient.
**
** @param receiverAddress - The address of the receiver.
** @param tokenID - The ID of the token to transfer.
******************************************************************************/
type TTransferERC721 = TWriteTransaction & {
	receiverAddress: TAddress | undefined;
	tokenID: bigint;
};
export async function transferERC721(props: TTransferERC721): Promise<TTxResponse> {
	assertAddress(props.receiverAddress, 'Receiver address');
	assertAddress(props.contractAddress, 'Contract address');
	const wagmiProvider = await toWagmiProvider(props.connector);
	assertAddress(wagmiProvider.address, 'User address');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: erc721ABI,
		functionName: 'safeTransferFrom',
		args: [wagmiProvider.address, props.receiverAddress, props.tokenID]
	});
}

/* 🔵 - Yearn Finance **********************************************************
** batchTransferERC721 is a _WRITE_ function that transfers a group of ERC721
** tokens to a recipient.
**
** @param collectionAddress - The address of the collection.
** @param receiverAddress - The address of the receiver.
** @param tokenIDs - The IDs of the tokens to transfer.
******************************************************************************/
type TBatchTransferERC721 = TWriteTransaction & {
	collectionAddress: TAddress | undefined;
	receiverAddress: TAddress | undefined;
	tokenIDs: bigint[];
};
export async function batchTransferERC721(props: TBatchTransferERC721): Promise<TTxResponse> {
	assertAddress(props.collectionAddress, 'Collection address');
	assertAddress(props.receiverAddress, 'Receiver address');
	assertAddress(props.contractAddress, 'Contract address');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: NFT_MIGRATOOOR_ABI,
		functionName: 'migrate',
		args: [props.collectionAddress, props.receiverAddress, props.tokenIDs]
	});
}



/* 🔵 - Yearn Finance **********************************************************
** transferERC721 is a _WRITE_ function that transfers an ERC721 token to a
** recipient.
**
** @param receiverAddress - The address of the receiver.
** @param tokenIDs - The IDs of the tokens to transfer.
******************************************************************************/
type TTransferERC1155 = TWriteTransaction & {
	receiverAddress: TAddress | undefined;
	tokenIDs: bigint[];
};
export async function transferERC1155(props: TTransferERC1155): Promise<TTxResponse> {
	assertAddress(props.receiverAddress, 'Receiver address');
	assertAddress(props.contractAddress, 'Contract address');
	const wagmiProvider = await toWagmiProvider(props.connector);
	assertAddress(wagmiProvider.address, 'User address');

	const balanceOfBatch = await readContract({
		...wagmiProvider,
		abi: ERC1155_ABI,
		address: props.contractAddress,
		functionName: 'balanceOfBatch',
		args: [Array(props.tokenIDs.length).fill(wagmiProvider.address), props.tokenIDs]
	});
	const filteredTokenIDs = [];
	const filteredAmounts = [];
	for (let i = 0; i < props.tokenIDs.length; i++) {
		if (balanceOfBatch[i] > 0n) {
			filteredTokenIDs.push(props.tokenIDs[i]);
			filteredAmounts.push(balanceOfBatch[i]);
		}
	}
	assert(filteredTokenIDs.length > 0, 'No tokens to transfer');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ERC1155_ABI,
		functionName: 'safeBatchTransferFrom',
		args: [wagmiProvider.address, props.receiverAddress, filteredTokenIDs, filteredAmounts, '0x']
	});
}

type TListERC1155 = TWriteTransaction & {
	tokenIDs: bigint[];
};
export async function listERC1155(props: TListERC1155): Promise<[bigint[], bigint[]]> {
	assertAddress(props.contractAddress, 'Contract address');
	const wagmiProvider = await toWagmiProvider(props.connector);
	assertAddress(wagmiProvider.address, 'User address');

	const balanceOfBatch = await readContract({
		...wagmiProvider,
		abi: ERC1155_ABI,
		address: props.contractAddress,
		functionName: 'balanceOfBatch',
		args: [Array(props.tokenIDs.length).fill(wagmiProvider.address), props.tokenIDs]
	});
	const filteredTokenIDs: bigint[] = [];
	const filteredAmounts: bigint[] = [];
	for (let i = 0; i < props.tokenIDs.length; i++) {
		if (balanceOfBatch[i] > 0n) {
			filteredTokenIDs.push(props.tokenIDs[i]);
			filteredAmounts.push(balanceOfBatch[i]);
		}
	}
	return [filteredTokenIDs, filteredAmounts];
}

/* 🔵 - Yearn Finance **********************************************************
** transferERC20 is a _WRITE_ function that transfers a token to a recipient.
**
** @param spenderAddress - The address of the spender.
** @param amount - The amount of collateral to deposit.
******************************************************************************/
type TTransferERC20 = TWriteTransaction & {
	receiverAddress: TAddress | undefined;
	amount: bigint;
};
export async function transferERC20(props: TTransferERC20): Promise<TTxResponse> {
	assertAddress(props.receiverAddress, 'receiverAddress');
	assertAddress(props.contractAddress);

	return await handleTx(props, {
		address: props.contractAddress,
		abi: erc20ABI,
		functionName: 'transfer',
		args: [props.receiverAddress, props.amount]
	});
}



/* 🔵 - Yearn Finance **********************************************************
** transferEther is a _WRITE_ function that transfers ETH to a recipient.
** Here, ETH represents the chain's native coin.
**
** @param spenderAddress - The address of the spender.
** @param amount - The amount of collateral to deposit.
******************************************************************************/
type TTransferEther = Omit<TWriteTransaction, 'contractAddress'> & {
	receiverAddress: TAddress | undefined;
	amount: bigint;
	shouldAdjustForGas?: boolean;
};
export async function transferEther(props: TTransferEther): Promise<TTxResponse> {
	assertAddress(props.receiverAddress, 'receiverAddress');

	props.statusHandler?.({...defaultTxStatus, pending: true});
	const wagmiProvider = await toWagmiProvider(props.connector);

	assertAddress(wagmiProvider.address, 'userAddress');
	try {
		let config = await prepareSendTransaction({
			...wagmiProvider,
			to: props.receiverAddress,
			value: props.amount
		});
		if (props.shouldAdjustForGas) {
			if (!config.maxPriorityFeePerGas) {
				const client = await getPublicClient({chainId: wagmiProvider.chainId});
				const gasPrice = await client.getGasPrice();
				config.maxPriorityFeePerGas = gasPrice;
			}
			const newAmount = (toBigInt(config.gas) * toBigInt(config.maxPriorityFeePerGas)) + 21_000n;
			config = await prepareSendTransaction({
				...wagmiProvider,
				to: props.receiverAddress,
				value: props.amount - newAmount
			});
		}
		const {hash} = await sendTransaction(config);
		const receipt = await waitForTransaction({chainId: wagmiProvider.chainId, hash});
		if (receipt.status === 'success') {
			props.statusHandler?.({...defaultTxStatus, success: true});
		} else if (receipt.status === 'reverted') {
			props.statusHandler?.({...defaultTxStatus, error: true});
		}
		return ({isSuccessful: receipt.status === 'success', receipt});
	} catch (error) {
		console.error(error);
		const errorAsBaseError = error as BaseError;
		props.statusHandler?.({...defaultTxStatus, error: true});
		return ({isSuccessful: false, error: errorAsBaseError || ''});
	} finally {
		setTimeout((): void => {
			props.statusHandler?.({...defaultTxStatus});
		}, 3000);
	}
}


/* 🔵 - Yearn Finance **********************************************************
** disperseETH is a _WRITE_ function that disperses ETH to a list of addresses.
**
** @param receivers - The addresses of the receivers.
** @param amounts - The amounts of ETH to send to each receiver.
******************************************************************************/
type TDisperseETH = TWriteTransaction & {
	receivers: TAddress[];
	amounts: bigint[];
};
export async function disperseETH(props: TDisperseETH): Promise<TTxResponse> {
	assertAddress(props.contractAddress);
	for (const receiver of props.receivers) {
		assertAddress(receiver, receiver);
	}
	for (const amount of props.amounts) {
		assert(amount > 0n, 'amount must be greater than 0');
	}
	assert(props.receivers.length === props.amounts.length, 'receivers and amounts must be the same length');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: DISPERSE_ABI,
		functionName: 'disperseEther',
		args: [props.receivers, props.amounts],
		value: props.amounts.reduce((a, b): bigint => a + b, 0n)
	});
}

/* 🔵 - Yearn Finance **********************************************************
** disperseERC20 is a _WRITE_ function that disperses ERC20 to a list of
** addresses.
**
** @param receivers - The addresses of the receivers.
** @param amounts - The amounts of ETH to send to each receiver.
******************************************************************************/
type TDisperseERC20 = TWriteTransaction & {
	tokenToDisperse: TAddress | undefined;
	receivers: TAddress[];
	amounts: bigint[];
};
export async function disperseERC20(props: TDisperseERC20): Promise<TTxResponse> {
	assertAddress(props.tokenToDisperse, 'The tokenToDisperse');
	assertAddress(props.contractAddress);
	for (const receiver of props.receivers) {
		assertAddress(receiver, receiver);
	}
	for (const amount of props.amounts) {
		assert(amount > 0n, 'amount must be greater than 0');
	}
	assert(props.receivers.length === props.amounts.length, 'receivers and amounts must be the same length');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: DISPERSE_ABI,
		functionName: 'disperseToken',
		args: [props.tokenToDisperse, props.receivers, props.amounts]
	});
}