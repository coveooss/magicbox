/// <reference path="../bin/jquery.d.ts" />
/// <reference path="../bin/underscore.d.ts" />
/// <reference path="./Grammar.ts" />
/// <reference path="./InputManager.ts"/>
/// <reference path="./SuggestionsManager.ts"/>
/// <reference path="./Utils.ts"/>
/// <reference path="./Grammars/Grammars.ts" />
module Coveo.MagicBox {

  export interface Options {
    inline?: boolean;
    selectableSuggestionClass?: string;
    selectedSuggestionClass?: string;
  }

  export class Instance {
    public onblur: () => void;
    public onfocus: () => void;
    public onchange: () => void;
    public onsuggestions: (suggestions: Suggestion[]) => void;
    public onsubmit: () => void;
    public onclear: () => void;

    public getSuggestions: () => Array<JQueryPromise<Suggestion[]>|Suggestion[]>;

    private inputManager: InputManager;
    private suggestionsManager: SuggestionsManager;
    private clearDom: HTMLElement;

    private lastSuggestions: Suggestion[] = [];

    private result: Result;
    private displayedResult: Result;

    constructor(public element: HTMLElement, public grammar: Grammar, public options: Options = {}) {
      if (_.isUndefined(this.options.inline)) {
        this.options.inline = false;
      }
      $(element)
        .addClass('magic-box')
        .toggleClass('magic-box-inline', this.options.inline);

      this.result = this.grammar.parse('');
      this.displayedResult = this.result.clean();

      this.clearDom = document.createElement('div');
      this.clearDom.className = "magic-box-clear";
      this.element.appendChild(this.clearDom);

      var icon = document.createElement('div');
      icon.className = "magic-box-icon";
      this.clearDom.appendChild(icon);

      var inputContainer = document.createElement('div');
      inputContainer.className = "magic-box-input";
      element.appendChild(inputContainer);

      this.inputManager = new InputManager(inputContainer, (text) => {
        this.setText(text);
        this.onChangeCursor();
        this.onchange && this.onchange();
      });

      this.inputManager.setResult(this.displayedResult);

      var suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = "magic-box-suggestions";
      this.element.appendChild(suggestionsContainer);

      this.suggestionsManager = new SuggestionsManager(suggestionsContainer, this.options.selectableSuggestionClass, this.options.selectedSuggestionClass);

      this.setupHandler();
    }

    public getResult() {
      return this.result;
    }

    public getDisplayedResult() {
      return this.displayedResult;
    }

    public setText(text: string) {
      $(this.element).toggleClass('magic-box-notEmpty', text.length > 0);

      this.result = this.grammar.parse(text);
      this.displayedResult = this.result.clean();

      this.inputManager.setResult(this.displayedResult);
    }

    public setCursor(index: number) {
      this.inputManager.setCursor(index);
    }

    public getCursor() {
      return this.inputManager.getCursor();
    }

    public resultAtCursor(match?: string|{ (result: Result): boolean }): Result[] {
      return this.displayedResult.resultAt(this.getCursor(), match);
    }

    private setupHandler() {
      this.inputManager.onblur = () => {
        $(this.element).removeClass('magic-box-hasFocus');
        if (!this.options.inline) {
          this.clearSuggestion();
        }
        this.onblur && this.onblur();
      }

      this.inputManager.onfocus = () => {
        $(this.element).addClass('magic-box-hasFocus');
        this.onChangeCursor();
        this.onfocus && this.onfocus();
      }

      this.inputManager.onkeyup = (key: number) => {
        if (key == 38) { // Up
          this.focusOnSuggestion(this.suggestionsManager.moveUp());
          this.onchange && this.onchange();
        } else if (key == 40) { // Down
          this.focusOnSuggestion(this.suggestionsManager.moveDown());
          this.onchange && this.onchange();
        } else {
          return true;
        }
        return false;
      }

      this.inputManager.onkeydown = (key: number) => {
        if (key == 38 || key == 40) { // Up, Down
          return false;
        }
        if (key == 13) { // Enter
          var suggestion = this.suggestionsManager.select();
          if (suggestion == null) {
            this.onsubmit && this.onsubmit();
          }
          return false;
        }
        return true;
      }

      this.inputManager.onchangecursor = () => {
        this.onChangeCursor();
      }

      this.inputManager.onkeyup = (key: number) => {
        if (key == 38) { // Up
          this.focusOnSuggestion(this.suggestionsManager.moveUp());
          this.onchange && this.onchange();
        } else if (key == 40) { // Down
          this.focusOnSuggestion(this.suggestionsManager.moveDown());
          this.onchange && this.onchange();
        } else {
          return true;
        }
        return false;
      }

      this.clearDom.onclick = () => {
        this.clear();
      }
    }

    private onChangeCursor() {
      this.suggestionsManager.mergeSuggestions(this.getSuggestions != null ? this.getSuggestions() : [], (suggestions) => {
        this.lastSuggestions = suggestions;
        this.inputManager.setWordCompletion(this.getFirstSuggestionText());
        this.onsuggestions && this.onsuggestions(suggestions);
        _.each(suggestions, (suggestion: Suggestion) => {
          if (suggestion.onSelect == null && suggestion.text != null) {
            suggestion.onSelect = () => {
              this.setText(suggestion.text);
              this.onsubmit && this.onsubmit();
            };
          }
        });
      });
    }

    public focus() {
      $(this.element).addClass('magic-box-hasFocus');
      this.inputManager.focus();
    }

    public blur() {
      this.inputManager.blur();
    }

    public clearSuggestion() {
      this.suggestionsManager.mergeSuggestions([]);
      this.inputManager.setWordCompletion(null);
    }

    private focusOnSuggestion(suggestion: Suggestion) {
      if (suggestion == null || suggestion.text == null) {
        this.inputManager.setResult(this.displayedResult, this.getFirstSuggestionText());
      } else {
        this.inputManager.setResult(this.grammar.parse(suggestion.text).clean(), suggestion.text);
      }
    }

    private getFirstSuggestionText() {
      var suggestion = _.find(this.lastSuggestions, (suggestion) => suggestion.text != null);
      return suggestion && suggestion.text;
    }

    public getText() {
      return this.inputManager.getValue();
    }

    public getWordCompletion() {
      return this.inputManager.getWordCompletion();
    }

    public clear() {
      this.setText('');
      this.onChangeCursor();
      this.focus();
      this.onclear && this.onclear();
    }
  }

  export function create(element: HTMLElement, grammar: Grammar, options?: Options) {
    return new Instance(element, grammar, options);
  }

  export function requestAnimationFrame(callback: () => void) {
    if ('requestAnimationFrame' in window) {
      return window.requestAnimationFrame(callback);
    }
    return setTimeout(callback);
  }
}
