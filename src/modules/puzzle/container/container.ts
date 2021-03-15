import { LightningElement, api } from 'lwc';

type Shape = 'circle' | 'square' | 'triangle';
type SelectableValues = '' | Shape;

interface Coordinates {
    column: number;
    row: number;
}

interface PuzzleHint {
    readonly key: string;
    readonly coordinates: Coordinates;
    readonly content: unknown;
    readonly style: string;
    shape: Shape;
}

interface PuzzlePiece {
    readonly key: string;
    readonly coordinates: Coordinates;
    readonly fill: string;
    readonly revealed: boolean;
    readonly style: string;
    selectedValue: SelectableValues;
    value: Shape;
}

const REVEAL_PROBABILITY = 0.5;
const SHAPES: Array<Shape> = ['circle', 'square', 'triangle'];
const SELECTABLE_VALUES: Array<SelectableValues> = ['', ...SHAPES];

class PuzzleTally {
    pieces: Array<PuzzlePiece>;

    constructor(pieces: Array<PuzzlePiece>) {
        this.pieces = pieces;
    }

    private getTally(columnOrRow: 'column' | 'row', columnOrRowNumber: number, shape: Shape) {
        const filtered = this.pieces.filter(({ coordinates, value }) => {
            return columnOrRowNumber === coordinates[columnOrRow] && shape === value;
        });
        return filtered.length;
    }

    getColumnTally(columnNumber: number, shape: Shape) {
        return this.getTally('column', columnNumber, shape);
    }

    getRowTally(rowNumber: number, shape: Shape) {
        return this.getTally('row', rowNumber, shape);
    }
}

function stringifyCoordinates({ column, row }: Coordinates) {
    return `[${column},${row}]`;
}

export default class Container extends LightningElement {
    @api
    get columns() {
        return this._columns;
    }
    set columns(val) {
        this._columns = Number(val);
    }
    _columns: number = 3;

    @api
    get rows() {
        return this._rows;
    }
    set rows(val) {
        this._rows = Number(val);
    }
    _rows: number = 3;

    @api
    get size() {
        return this._size;
    }
    set size(val) {
        this._size = Number(val);
    }
    _size: number = 70;

    @api
    checkValidity() {
        return !this.pieces.some(({ value, selectedValue }) => value !== selectedValue);
    }

    get gridContainerStyle() {
        const numOptions = SHAPES.length;
        const totalColumns = this.columns + numOptions;
        const totalRows = this.rows + numOptions;
        return `
            grid-template-columns: repeat(${totalColumns}, 1fr);
            grid-template-rows: repeat(${totalRows}, 1fr);
            width: ${totalColumns * this.size}px;
            height: ${totalRows * this.size}px;
        `.replace(/\s+/g, '');
    }

    get puzzleShapeStyle() {
        return `
            width: ${this.size}px;
            height: ${this.size}px;
        `.replace(/\s+/g, '');
    }

    computeGridItemStyle(coordinates: Coordinates, width = 1, height = 1) {
        const { column, row } = coordinates;
        const columnStart = column + 1;
        const columnEnd = column + 1 + width;
        const rowStart = row + 1;
        const rowEnd = row + 1 + height;
        return `
            grid-column: ${columnStart} / ${columnEnd};
            grid-row: ${rowStart} / ${rowEnd};
            width: ${this.size * width}px;
            height: ${this.size * height}px;
        `.replace(/\s+/g, '');
    }

    handleClick(event) {
        const piece = this.pieces.find(({ key }) => key === event.target.uid);
        const { revealed, selectedValue } = piece;
        if (revealed) {
            return;
        }
        const index = SELECTABLE_VALUES.indexOf(selectedValue);
        const nextIndex = (index + 1) % SELECTABLE_VALUES.length;
        piece.selectedValue = SELECTABLE_VALUES[nextIndex];

        // Force a render by updating the array reference.
        this.pieces = [...this.pieces];
    }

    hints: Array<PuzzleHint> = [];

    pieces: Array<PuzzlePiece> = [];

    _generatePieces() {
        const count = this.columns * this.rows;
        let pieces: Array<PuzzlePiece> = [];
        for (let index = 0; index < count; index += 1) {
            const coordinates = {
                column: (index % this.columns) + SHAPES.length,
                row: Math.floor(index / this.columns) + SHAPES.length,
            };
            const key = stringifyCoordinates(coordinates);
            const style = this.computeGridItemStyle(coordinates);
            const revealed = REVEAL_PROBABILITY < Math.random();
            const value = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            const selectedValue = revealed ? value : '';
            const fill = revealed ? '#333' : 'rgb(0 112 210)';
            const piece: PuzzlePiece = {
                coordinates,
                fill,
                key,
                revealed,
                selectedValue,
                style,
                value,
            };
            pieces = [...pieces, piece];
        }
        return pieces;
    }

    _generateHints(total: number, start: number, isRow: boolean) {
        const tally = new PuzzleTally(this.pieces);

        let hints: Array<PuzzleHint> = [];
        SHAPES.forEach((shape, index) => {
            for (let coord = start; coord < total; coord += 1) {
                let coordinates: Coordinates;
                let content = 0;
                if (isRow) {
                    coordinates = { column: index, row: coord };
                    content = tally.getRowTally(coord, shape);
                } else {
                    coordinates = { column: coord, row: index };
                    content = tally.getColumnTally(coord, shape);
                }
                const key = stringifyCoordinates(coordinates);
                const style = this.computeGridItemStyle(coordinates);
                const hint: PuzzleHint = {
                    content,
                    coordinates,
                    key,
                    shape,
                    style,
                };
                hints = [...hints, hint];
            }
        });
        return hints;
    }

    generateRowHints() {
        const total = this.rows + SHAPES.length;
        const start = SHAPES.length;
        const isRow = true;
        return this._generateHints(total, start, isRow);
    }

    generateColumnHints() {
        const total = this.columns + SHAPES.length;
        const start = SHAPES.length;
        const isRow = false;
        return this._generateHints(total, start, isRow);
    }

    generateHints() {
        this.hints = [...this.generateColumnHints(), ...this.generateRowHints()];
    }

    generatePieces() {
        this.pieces = this._generatePieces();
    }

    connectedCallback() {
        this.generatePieces();
        this.generateHints();
    }
}
