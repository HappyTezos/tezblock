import { Component, Input } from '@angular/core'

import { toAlias } from '@tezblock/interfaces/proposal'

interface Options {
  kind: 'transaction' | 'endorsement' | 'proposal',
  skipAlias: boolean
}

@Component({
  selector: 'app-hash-cell',
  templateUrl: './hash-cell.component.html',
  styleUrls: ['./hash-cell.component.scss']
})
export class HashCellComponent {
  @Input()
  set data(value: any) {
    this.setData(value)
  }
  get data(): any {
    return this._data
  }
  private _data: any

  get linkPath(): string {
    return `/${(this.options && this.options.kind) || 'transaction'}`
  }

  set options(value: Options) {
    this.setOptions(value)
  }
  get options(): Options {
    return this._options
  }
  private _options: Options

  alias: string

  private setData(value: any) {
    if (value !== this._data) {
      this._data = value
      this.setAllias()
    }
  }

  private setOptions(value: Options) {
    if (value !== this._options) {
      this._options = value
      this.setAllias()
    }
  }

  private setAllias() {
    if (this.options && this.options.kind === 'proposal' && !this.options.skipAlias) {
      const alias = toAlias(this._data)

      this.alias = alias !== this._data ? alias : null
    }
  }
}
