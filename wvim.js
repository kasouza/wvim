const BufferManager = {
    buffer: [],

    isBufferEmpty() {
        return BufferManager.buffer.length == 0;
    },

    getRow(row) {
        return BufferManager.buffer[row];
    },

    appendRow(row1, row2) {
        BufferManager.buffer[row1].push(...BufferManager.buffer[row2]);
    },

    createRow(row) {
        BufferManager.buffer.splice(row, 0, []);
    },

    createRowIfNotExists(row) {
        if(!BufferManager.buffer[row]) {
            BufferManager.buffer[row] = [];
        }
    },

    removeRow(row) {
        BufferManager.buffer.splice(row, 1);
    },

    removeRowIfEmpty(row) {
        if(BufferManager.doRowExist(row) && BufferManager.buffer[row].length == 0) {
            BufferManager.removeRow(row);
            return true;
        }

        return false;
    },

    doRowExist(row) {
        return BufferManager.buffer[row] != undefined;
    },

    insertCharAt(char, position) {
        const {row, col} = position;

        BufferManager.createRowIfNotExists(row);
        BufferManager.buffer[row].splice(col, 0, char);
    },

    getCharAt(position) {
        const {row, col} = position;
        if(!BufferManager.doRowExist(row)) return;

        return BufferManager.buffer[row][col];
    },

    removeCharAt(position) {
        const {row, col} = position;

        if(BufferManager.buffer[row]) {
            BufferManager.buffer[row].splice(col, 1);
        }
    },
    
    getBufferLength() {
        return BufferManager.buffer.length;
    },

    getRowLength(row) {
        BufferManager.createRowIfNotExists(row);
        return BufferManager.buffer[row].length;
    }
}

const CursorManager = {
    col: 0,
    row: 0,

    getCursorPosition() {
        return {
            col: CursorManager.col,
            row: CursorManager.row,
        };
    },

    moveLeft(n) {
        CursorManager.col = Math.max(CursorManager.col - n, 0);
    },

    moveDown(n) {
        CursorManager.row = Math.min(BufferManager.getBufferLength(), CursorManager.row + n);
    },

    moveUp(n) { 
        CursorManager.row = Math.max(CursorManager.row - n, 0);
    },

    moveRigth(n) {
        CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col + n);
    }
}

const ModeManager = {
    modes: ['normal', 'insert'],
    currentMode: 'normal',

    enterNormalMode() {
        CursorManager.moveLeft(1);
        ModeManager.currentMode = 'normal';
    },

    insertModePositions: {
        // This is here just to make sure positionIn is valid
        // although it is not actully needed
        before() {},

        after() {
            CursorManager.moveRigth(1);
        },
    },

    enterInsertMode(positionIn) {
        const pos = ModeManager.insertModePositions[positionIn];
        if(pos) {
            pos();
            ModeManager.currentMode = 'insert';
        }
    },

    handleInput(key) {
        const mode = ModeManager[ModeManager.currentMode];
        if(mode) {
            mode(key);
        }
    },

    normalSpecialKeys: {
        'h': () => CursorManager.moveLeft(1, ModeManager.currentMode),

        'j': () => {
            const { row } = CursorManager.getCursorPosition();
            const length = BufferManager.getBufferLength();

            if(row + 1 < length) {
                CursorManager.moveDown(1, ModeManager.currentMode);
            }
        },

        'k': () => CursorManager.moveUp(1, ModeManager.currentMode),

        'l': () => {
            const { col, row } = CursorManager.getCursorPosition();
            const length = BufferManager.getRowLength(row);

            if(col + 1 < length) {
                CursorManager.moveRigth(1, ModeManager.currentMode);
            }
        },

        'i': () => ModeManager.enterInsertMode('before'),
        'a': () => ModeManager.enterInsertMode('after'),
    },

    insertSpecialKeys: {
        'Escape': () => ModeManager.enterNormalMode(),

        'Enter': () => {
            const {row} = CursorManager.getCursorPosition();
            if(!BufferManager.isBufferEmpty()) {
                CursorManager.moveDown(1);
            }

            BufferManager.createRow(row + 1);
        },

        'Backspace': () => {
            const {row, col} = CursorManager.getCursorPosition();

            if(!BufferManager.doRowExist(row)) return;

            if(BufferManager.removeRowIfEmpty(row)) {
                CursorManager.moveUp(1);
                return;
            }

            if(col - 1 >= 0) {
                BufferManager.removeCharAt({ col: col - 1, row });
                CursorManager.moveLeft(1);
            } else {
                if(row - 1 < 0) return;
                BufferManager.appendRow(row - 1, row);
                BufferManager.removeRow(row);
                CursorManager.moveUp(1);
            }
        }
    },

    normal(key) {
        const specialKeyAction = ModeManager.normalSpecialKeys[key];
        if(specialKeyAction) {
            specialKeyAction();
        }
    },

    insert(key) {
        const specialAction = ModeManager.insertSpecialKeys[key];
        if(specialAction) {
            specialAction();
            return;
        }

        BufferManager.insertCharAt(key, CursorManager.getCursorPosition());
        CursorManager.moveRigth(1);
    }
}

document.addEventListener('keydown', e => {
    e.preventDefault();
    ModeManager.handleInput(e.key);
    console.log(ModeManager.currentMode);
    console.log(BufferManager.buffer);
    console.log(CursorManager.getCursorPosition());
});
