/// <reference path="../Grammar.ts" />
module Coveo.MagicBox {
  export class ExpressionRegExp implements Expression {
    constructor(public value: RegExp, public id: string, grammar: Grammar) {
    }

    parse(input: string, end: boolean): Result {
      var groups = input.match(this.value);
      if (groups != null && groups.index != 0) {
        groups = null;
      }
      var result = new Result( groups != null ? groups[0] : null , this, input);
      if (result.isSuccess() && end && input.length > result.value.length) {
        return new EndOfInputResult(result);
      }
      return result;
    }

    public toString() {
      return this.id;
    }
  }
}