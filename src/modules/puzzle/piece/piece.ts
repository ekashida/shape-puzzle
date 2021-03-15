import { LightningElement, api } from 'lwc';

export default class Piece extends LightningElement {
    @api
    disabled: boolean;

    @api
    uid: string;

    @api
    value: string;

    @api
    fill: string;
}
