import {describe, expect, it} from "vitest";
import {matchBankCredit, type VerifiedCredit} from "./bank-reconciliation";

const credit: VerifiedCredit = {source:"bank-feed", transactionId:"bank-123",recipientBsb:"032070",recipientAccount:"914904",amountCents:3000,currency:"AUD",reference:"RC 0357060",settled:true};
const invoice = {customerNumber:"RC 0357060",amountCents:3000,currency:"AUD" as const};
describe("verified bank credit matching",()=>{
  it("requires the settled credit, exact account, amount and RC reference",()=>{
    expect(matchBankCredit(credit,invoice)).toBe("match");
    expect(matchBankCredit({...credit,settled:false},invoice)).toBe("ignore");
    expect(matchBankCredit({...credit,recipientAccount:"914905"},invoice)).toBe("ignore");
    expect(matchBankCredit({...credit,amountCents:2900},invoice)).toBe("review");
    expect(matchBankCredit({...credit,reference:"RC 0357071"},invoice)).toBe("review");
    expect(matchBankCredit({...credit,reference:"RC 0357060 RC 0357071"},invoice)).toBe("review");
    expect(matchBankCredit({...credit,reference:"Customer uploaded receipt RC 0357060"},invoice)).toBe("match");
  });
});
