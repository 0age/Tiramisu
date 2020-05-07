import { ECDSASignature } from 'ethereumjs-util'

export type SoftWithdrawalData = {
  nonce: number;
  accountIndex: number;
  withdrawalAddress: string;
  value: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export interface SoftWithdrawalInput extends SoftWithdrawalData {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}