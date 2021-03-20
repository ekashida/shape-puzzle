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
    readonly content: number;
    readonly shape: Shape;
    readonly style: string;
    fill: string;
}

interface PuzzlePiece {
    readonly key: string;
    readonly coordinates: Coordinates;
    readonly fill: string;
    readonly revealed: boolean;
    readonly style: string;
    readonly value: Shape;
    selectedValue: SelectableValues;
}

// https://coolors.co/4d9de0-e15554-e1bc29-3bb273
const FILL_COLORS = {
    REVEALED_FILL: '#333333',
    SELECTED_FILL: '#4D9DE0',
    COMPLETE_HINT: '#3BB273',
    INCOMPLETE_HINT: '#CCCCCC',
};

const REVEAL_PROBABILITY = 0.5;
const SHAPES: Array<Shape> = ['circle', 'square', 'triangle'];
const SELECTABLE_VALUES: Array<SelectableValues> = ['', ...SHAPES];

class PuzzleTally {
    pieces: Array<PuzzlePiece>;

    constructor(pieces: Array<PuzzlePiece>) {
        this.pieces = pieces;
    }

    private getValueCount(columnOrRow: 'column' | 'row', columnOrRowNumber: number, shape: Shape) {
        const filtered = this.pieces.filter(({ coordinates, value }) => {
            return columnOrRowNumber === coordinates[columnOrRow] && shape === value;
        });
        return filtered.length;
    }

    private getSelectedCount(columnOrRow: 'column' | 'row', columnOrRowNumber: number, shape: Shape) {
        const filtered = this.pieces.filter(({ coordinates, selectedValue }) => {
            return columnOrRowNumber === coordinates[columnOrRow] && shape === selectedValue;
        });
        return filtered.length;
    }

    getColumnValueCount(columnNumber: number, shape: Shape) {
        return this.getValueCount('column', columnNumber, shape);
    }

    getColumnSelectedCount(columnNumber: number, shape: Shape) {
        return this.getSelectedCount('column', columnNumber, shape);
    }

    getRowTally(rowNumber: number, shape: Shape) {
        return this.getValueCount('row', rowNumber, shape);
    }

    getValidRowTally(rowNumber: number, shape: Shape) {
        return this.getSelectedCount('row', rowNumber, shape);
    }
}

function stringifyCoordinates({ column, row }: Coordinates) {
    return `[${column},${row}]`;
}

export default class Container extends LightningElement {
    @api
    enableAssist = false;

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

    @api
    reset() {
        this.pieces
            .filter(({ revealed }) => !revealed)
            .forEach((piece) => {
                piece.selectedValue = '';
            });
        this.pieces = [...this.pieces];
        if (this.enableAssist) {
            this.generateHints();
        }
    }

    @api
    new() {
        this.generatePieces();
        this.generateHints();
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
        const { selectedValue } = piece;
        const index = SELECTABLE_VALUES.indexOf(selectedValue);
        const nextIndex = (index + 1) % SELECTABLE_VALUES.length;
        piece.selectedValue = SELECTABLE_VALUES[nextIndex];

        // Force a render by updating the array reference.
        this.pieces = [...this.pieces];

        if (this.enableAssist) {
            this.generateHints();
        }
    }

    handleNewClick() {
        this.new();
    }

    handleResetClick() {
        this.reset();
    }

    handleAssistClick() {
        this.enableAssist = !this.enableAssist;
        this.generateHints();
    }

    hints: Array<PuzzleHint> = [];

    pieces: Array<PuzzlePiece> = [];

    _generatePieces() {
        const { REVEALED_FILL, SELECTED_FILL } = FILL_COLORS;
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
            const fill = revealed ? REVEALED_FILL : SELECTED_FILL;
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
        const { COMPLETE_HINT, INCOMPLETE_HINT } = FILL_COLORS;
        const puzzleTally = new PuzzleTally(this.pieces);

        let hints: Array<PuzzleHint> = [];
        SHAPES.forEach((shape, index) => {
            for (let coord = start; coord < total; coord += 1) {
                let coordinates: Coordinates;
                let valueCount: number;
                let selectedCount: number;
                if (isRow) {
                    valueCount = puzzleTally.getRowTally(coord, shape);
                    selectedCount = puzzleTally.getValidRowTally(coord, shape);
                    coordinates = { column: index, row: coord };
                } else {
                    valueCount = puzzleTally.getColumnValueCount(coord, shape);
                    selectedCount = puzzleTally.getColumnSelectedCount(coord, shape);
                    coordinates = { column: coord, row: index };
                }
                const fill = valueCount === selectedCount && this.enableAssist ? COMPLETE_HINT : INCOMPLETE_HINT;
                const key = stringifyCoordinates(coordinates);
                const style = this.computeGridItemStyle(coordinates);
                const hint: PuzzleHint = {
                    content: valueCount,
                    coordinates,
                    fill,
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
