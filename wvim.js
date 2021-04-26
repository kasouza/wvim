const BufferManager = {
    buffer: [],

    isBufferEmpty() {
        return BufferManager.buffer.length == 0;
    },

    getRow(row) {
        return BufferManager.buffer[row].slice(0);
    },

    sliceRow(row, start, end) {
        if(!start) start = 0;
        if(!end) end = BufferManager.buffer[row].length;

        return BufferManager.buffer[row].slice(start, end);
    },

    spliceRow(row, start, deleteCount, ...elements) {
        if(row == undefined) return;
        if(!start) start = 0;
        if(!deleteCount) deleteCount = BufferManager.buffer[row].length - start;
        
        BufferManager.buffer[row].splice(start, deleteCount, ...elements);
    },

    appendList(row, list) {
        BufferManager.buffer[row].push(...list);
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
    },

    getRowString(row) {
        if(BufferManager.doRowExist(row)) {
            const buffer = BufferManager.buffer.slice(0);
            return buffer[row]
                .map(char => char === ' ' ? '&nbsp;' : char)
                .map(char => char === 'Tab' ? '&#9;' : char)
                .join('');
        }
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
        CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col);
    },

    moveUp(n) { 
        CursorManager.row = Math.max(CursorManager.row - n, 0);
        CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col);
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
            const {row,col} = CursorManager.getCursorPosition();
            if(!BufferManager.isBufferEmpty()) {
                CursorManager.moveDown(1);
            }

            BufferManager.createRow(row + 1);
            Utils.pprint(BufferManager.buffer);

            const afterCursor = BufferManager.sliceRow(row, col);
            if(afterCursor.length != 0) {
                BufferManager.spliceRow(row, col);
                BufferManager.appendList(row + 1, afterCursor);
            }
        },

        'Backspace': () => {
            const {row, col} = CursorManager.getCursorPosition();

            if(!BufferManager.doRowExist(row)) return;

            if(BufferManager.removeRowIfEmpty(row)) {
                const l = BufferManager.getRowLength(row - 1);
                CursorManager.moveUp(1);
                CursorManager.moveRigth(l);
                return;
            }

            if(col - 1 >= 0) {
                BufferManager.removeCharAt({ col: col - 1, row });
                CursorManager.moveLeft(1);
            } else {
                if(row - 1 < 0) return;
                const l = BufferManager.getRowLength(row - 1);
                BufferManager.appendRow(row - 1, row);
                BufferManager.removeRow(row);
                CursorManager.moveUp(1);
                CursorManager.moveRigth(l);
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

const Utils = {
    arraysEqual(a, b) {
        if(!a || !b) return false;
        if(a === b) return true;
        if(a.length != b.length) return false;

        const a2 = a.slice(0);
        const b2 = b.slice(0);

        for(let i = 0; i < a2.length; i++) {
            if(a2[i] !== b2[i]) {
                return false;
            }
        }

        return true;
    },

    pprint(arr) {
        console.log('[');
        if(!arr) return;

        for(let i = 0; i < arr.length; i++)
            console.log(BufferManager.getRowString(i));

        console.log(']');
    }
}

const DOMManager = {
    editor: document.querySelector('#editor'),
    nodes: [],

    lineNumbersContainer: document.querySelector('#line-numbers'),
    lineNumbers: [],

    renderHTML() {
        const nodes = DOMManager.nodes;
        const buffer = BufferManager.buffer;

        const children = DOMManager.editor.children;

        for(let row = 0; row < Math.max(nodes.length, buffer.length); row++) {
            if(nodes[row] == undefined && buffer[row] != undefined) {
                nodes.splice(row, 0, buffer[row].slice(0));
                
                const rowHTML = DOMManager.getRowHTML(row)
                if(children[row] != undefined && children[row].nextSibling != undefined) {
                    DOMManager.editor.insertBefore(rowHTML, children[row].nextSibling);
                } else {
                    DOMManager.editor.appendChild(rowHTML);
                }

            } else if(nodes[row] != undefined && buffer[row] == undefined) {
                nodes.splice(row, 1);
                DOMManager.editor.removeChild(children[row]);

            } else if(!Utils.arraysEqual(nodes[row], buffer[row])) {
                nodes[row] = buffer[row].slice(0);
                children[row].innerHTML = BufferManager.getRowString(row);
            }
        }

        const lineNumbers = DOMManager.lineNumbers;
        const lineChildren = DOMManager.lineNumbersContainer.children;

        for(let i = 0; i < Math.max(nodes.length, lineNumbers.length); i++) {
            if(lineNumbers[i] == undefined && nodes[i]) {
                lineNumbers.splice(i, 0, i);

                const lineNumberHTML = DOMManager.getLineNumberHTML(i + 1);
                if(lineChildren[i] != undefined && lineChildren[i].nextSibling) {
                    DOMManager.lineNumbersContainer.insertBefore(lineNumberHTML, lineChildren[row].nextSibling);
                } else {
                    DOMManager.lineNumbersContainer.appendChild(lineNumberHTML);
                }

            } else if(lineNumbers[i] != undefined && !nodes[i]) {
                lineNumbers.splice(i, 1);
                DOMManager.lineNumbersContainer.removeChild(lineChildren[i]);

            } else if(lineNumbers[i] != i) {
                lineNumber[i] = i;
                lineChildren[i].innerHTML = i + 1;
                alert('sssssssssssss');
            }
        }
    },

    getRowHTML(row) {
        const div = document.createElement('div');
        div.innerHTML = BufferManager.getRowString(row);

        return div;
    },

    getLineNumberHTML(i) {
        const div = document.createElement('div');
        div.innerHTML = i;

        return div;
    }
} 

document.addEventListener('keydown', e => {
    e.preventDefault();
    ModeManager.handleInput(e.key);
    DOMManager.renderHTML();
});
