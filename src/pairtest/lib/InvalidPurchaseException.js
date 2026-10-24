export default class InvalidPurchaseException extends Error {
  name = 'InvalidPurchaseException';

  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
