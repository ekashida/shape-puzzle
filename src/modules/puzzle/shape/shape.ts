import { LightningElement, api } from 'lwc';

export default class Shape extends LightningElement {
    @api
    value: 'circle' | 'square' | 'triangle';

    @api
    fill = '#000';

    get isCircle() {
        return this.value === 'circle';
    }

    get isSquare() {
        return this.value === 'square';
    }

    get isTriangle() {
        return this.value === 'triangle';
    }
}
