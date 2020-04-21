const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, HardDeposit } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Hard Deposit", () => {
  let account,
    state,
    contract,
    signer,
    initialAccount,
    initialStateSize,
    depositAmount;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    contract = randomAccount();
    signer = randomAccount();
    const initialAccountBalance = 50;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    const accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    depositAmount = 25;

    const hardDeposit = new HardDeposit({
      accountIndex,
      hardTransactionIndex: 0,
      value: depositAmount
    });

    await stateMachine.hardDeposit(hardDeposit);
    account = await state.getAccount(accountIndex);
  });

  it("Should have kept the account at the same index", async () => {
    expect(account.address).to.eql(initialAccount.address);
  });

  it("Should not have modified the account's signers", async () => {
    expect(account.signers.length).to.eql(initialAccount.signers.length);
    for (let signer of initialAccount.signers) {
      expect(account.hasSigner(toHex(signer))).to.be.true;
    }
    expect(account.signers).to.eql(initialAccount.signers);
  });

  it("Should have deposited the amount to the account", async () => {
    expect(account.balance).to.eql(initialAccount.balance + depositAmount);
  });

  it("Should not have updated the account nonce", async () => {
    expect(account.nonce).to.eql(initialAccount.nonce);
  });

  it("Should not have updated the state size", async () => {
    expect(state.size).to.eql(initialStateSize);
  });
});
