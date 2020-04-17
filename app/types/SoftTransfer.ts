import {SoftTransferTransaction} from "./TransactionInterfaces";
import {AccountType} from "./Account";

const { toBuf, toHex, toInt } = require('../lib/to');
const { ecrecover, keccak256, ecsign, pubToAddress, fromRpcSig, toRpcSig } = require('ethereumjs-utils')

interface SoftTransferArguments {
    fromAccountIndex: number;
    toAccountIndex: number;
    nonce: number;
    value: number;
    signature?: string;
    privateKey?: Buffer;
}

class SoftTransfer implements SoftTransferTransaction {
    toAccountIndex: number;
    nonce: number;
    value: number;
    signature: string;
    intermediateStateRoot: string;
    accountIndex: number;
    fromAccountIndex: number;
    resolve: () => void;
    reject: () => void;

    get prefix():number {
        return 6;
    }

    constructor(args: SoftTransferArguments) {
        const {
            fromAccountIndex,
            toAccountIndex,
            nonce,
            value,
            signature,
            privateKey
        } = args;
        this.fromAccountIndex = toInt(fromAccountIndex);
        this.toAccountIndex = toInt(toAccountIndex);
        this.nonce = toInt(nonce);
        this.value = toInt(value);

        let sig = (privateKey) ? this.sign(privateKey) : signature

        if (typeof sig == 'object') this.signature = toRpcSig(sig.v, sig.r, sig.s);
        else this.signature = toHex(sig);
    }

    assignResolvers(resolve: () => void, reject: () => void): void {
        this.resolve = resolve;
        this.reject = reject;
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const fromIndex = toBuf(this.fromAccountIndex, 4) as Buffer;
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            fromIndex,
            toIndex,
            nonce,
            value,
            sig,
            root
        ]);
    }

    toMessageHash(): string {
        const fromIndex = toBuf(this.fromAccountIndex, 4) as Buffer;
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const msg = Buffer.concat([
            fromIndex,
            toIndex,
            nonce,
            value
        ]);
        return keccak256(msg);
    }

    sign(privateKey: Buffer): string {
        const msgHash = this.toMessageHash();
        return ecsign(msgHash, privateKey);
    }

    getSignerAddress(): string {
        const msgHash = this.toMessageHash() as string;
        const { v, r, s } = fromRpcSig(this.signature);
        try {
            const publicKey = ecrecover(msgHash, v, r, s);
            return toHex(pubToAddress(publicKey, true));
        } catch(err) {
            console.log(err)
            return null;
        }
    }

    checkValid(account: AccountType): string {
        const signer = this.getSignerAddress() as string;
        if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        if (!account.checkNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
        if (!account.hasSufficientBalance(this.value)) return `Insufficient balance. Account has ${account.balance}.`;
    }
}

module.exports = SoftTransfer;
