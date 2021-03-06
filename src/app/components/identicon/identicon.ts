import { Component, Input } from '@angular/core'
import { createIcon } from '@download/blockies'
import { BigNumber } from 'bignumber.js'
import { toDataUrl } from 'myetherwallet-blockies'

const accounts = require('../../../assets/bakers/json/accounts.json')

@Component({
  selector: 'identicon',
  templateUrl: 'identicon.html',
  styleUrls: ['./identicon.scss']
})
export class IdenticonComponent {
  public hasBakerIcon: boolean = false
  public bakerIconUrl: string = ''
  public displayIdenticonNotLogo: boolean = false

  public identicon: string = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' // transparent

  @Input()
  public sizeLarge: boolean = false

  @Input()
  set forceIdenticon(value: boolean) {
    this.displayIdenticonNotLogo = value
  }

  @Input()
  set address(value: string) {
    if (!value) {
      return
    }

    if (accounts.hasOwnProperty(value) && accounts[value].hasLogo && !this.displayIdenticonNotLogo) {
      this.identicon = `assets/bakers/img/${value}.png`
    } else {
      if (value.startsWith('ak_')) {
        this.identicon = createIcon({ seed: value }).toDataURL()
      } else if (value.startsWith('tz') || value.startsWith('kt')) {
        this.identicon = createIcon({ seed: `0${this.b582int(value)}`, spotcolor: '#000' }).toDataURL()
      } else {
        this.identicon = toDataUrl(value.toLowerCase())
      }
    }
  }

  private b582int(val: string): string {
    let rv = new BigNumber(0)
    const alpha = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    for (let i = 0; i < val.length; i++) {
      rv = rv.plus(new BigNumber(alpha.indexOf(val[val.length - 1 - i])).multipliedBy(new BigNumber(alpha.length).exponentiatedBy(i)))
    }

    return rv.toString(16)
  }
}
