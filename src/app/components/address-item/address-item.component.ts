import { Component, Input } from '@angular/core'

import { getContractByAddress } from '@tezblock/domain/contract'

@Component({
  selector: 'address-item',
  templateUrl: './address-item.component.html',
  styleUrls: ['./address-item.component.scss']
})
export class AddressItemComponent {
  @Input()
  public address?: string

  @Input()
  public clickableButton: boolean = true

  @Input()
  public hideIdenticon: boolean = false

  @Input()
  public forceIdenticon: boolean = false

  @Input()
  public showFull: boolean = false

  @Input()
  public isText: boolean

  constructor(private readonly router: Router) {}

  public inspectDetail() {
    if (!this.isText && this.clickableButton) {
      const contract = getContractByAddress(this.address)

      if (contract) {
        this.router.navigate([`/contract/${this.address}`])

        return
      }

      this.router.navigate([`/account/${this.address}`])
    }
  }
}
