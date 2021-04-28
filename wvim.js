const $ = document.querySelector.bind(document);

// This is used to get the heigth and width of each char
// so we can calculate where to put the cursor
// yeah i know it's ugly but i don't think there's other way to do it
const tempElement = document.createElement('div');
tempElement.innerText = 'a';
tempElement.style.display = 'inline-block';

$('body').appendChild(tempElement);
const charHeight = tempElement.clientHeight;
const charWidth = tempElement.clientWidth;
const letterSpacing = tempElement.style.letterSpacing;
$('body').removeChild(tempElement);

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
        if(BufferManager.buffer[row] == undefined) return;

        return BufferManager.buffer[row].length;
    },

    getRowString(row) {
        if(BufferManager.doRowExist(row)) {
            const buffer = BufferManager.buffer.slice(0);
            return buffer[row]
                .map(e => e && e.innerText ? `<span id="cursor" class="${ModeManager.currentMode}">${e.innerText}</span>` : e)
                .map(char => char === ' ' ? '&nbsp;' : char)
                .map(char => char === 'Tab' ? '&#9;' : char)
                .join('');
        }
    },

    removeCursor() {
        const { row, col } = CursorManager.getCursorPosition();
        if(BufferManager.buffer[row] == undefined || BufferManager.buffer[row][col] == undefined || !BufferManager.buffer[row][col].innerText) return;

        if(!BufferManager.buffer[row][col].shouldRender) {
            BufferManager.spliceRow(row, col, 1);
            return;
        }

        const temp = BufferManager.buffer[row][col].innerText;
        BufferManager.buffer[row][col] = temp;
    },

    updateCursor() {
        const { row, col } = CursorManager.getCursorPosition();
        if(BufferManager.buffer[row][col] && BufferManager.buffer[row][col].innerText != undefined) return;

        const cursor = {
            innerText: BufferManager.buffer[row][col] || ' ',
            shouldRender: true,
        }

        if(!BufferManager.buffer[row][col]) {
            cursor.innerText = ' ';
            cursor.shouldRender = false;
        }


        BufferManager.buffer[row][col] = cursor;
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
        Utils.updateCursor(() => {
            CursorManager.col = Math.max(CursorManager.col - n, 0);
        });
    },

    moveDown(n) {
        Utils.updateCursor(() => {
            CursorManager.row = Math.min(BufferManager.getBufferLength(), CursorManager.row + n);
            CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col);
        });
    },

    moveUp(n) { 
        Utils.updateCursor(() => {
            CursorManager.row = Math.max(CursorManager.row - n, 0);
            CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col);
        });
    },

    moveRigth(n) {
        Utils.updateCursor(() => {
            CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col + n);
        });
    }
}

const ModeManager = {
    modes: ['normal', 'insert'],
    currentMode: 'normal',

    enterNormalMode() {
        const { row, col } = CursorManager.getCursorPosition();
        CursorManager.moveLeft(1);
        ModeManager.currentMode = 'normal';
        DOMManager.updateModeString();

        if(Utils.isCursor(BufferManager.buffer[row][col])
            && !BufferManager.buffer[row][col].shouldRender) {
            BufferManager.removeCursor();
        }
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
        DOMManager.updateModeString();
    },

    handleInput(key) {
        const mode = ModeManager[ModeManager.currentMode];
        if(mode) {
            mode(key);
        }
    },

    normalSpecialKeys: {
        'h': () => CursorManager.moveLeft(1, ModeManager.currentMode),

        'j': () => { const { row } = CursorManager.getCursorPosition();
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
            // All these bois here need to be in that exact order
            const {row,col} = CursorManager.getCursorPosition();
            BufferManager.createRow(row + 1);

            const afterCursor = BufferManager.sliceRow(row, col);
            console.log()
            if(afterCursor.length > 0 && !(Utils.isCursor(afterCursor[0]) && !afterCursor[0].shouldRender)) {
                BufferManager.spliceRow(row, col);
                BufferManager.appendList(row + 1, afterCursor);
            }

            CursorManager.moveDown(1);
        },

        'Backspace': () => {
            const {row, col} = CursorManager.getCursorPosition();

            if(!BufferManager.doRowExist(row)) return;

            if(BufferManager.removeRowIfEmpty(row)) {
                if(row - 1 < 0) return;

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
    isCursor(e) {
        if(!e) return false;
        return e.innerText != undefined && e.shouldRender != undefined;
    },

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
    },

    updateCursor(cb) {
        BufferManager.removeCursor();
        cb();
        DOMManager.updateCursorPosition();
        BufferManager.updateCursor();
    }
}

const DOMManager = {
    mode: $('#mode'),
    cursor: $('#cursor'),
    cursorPosition: $('#cursor-position'),
    editor: $('#editor'),
    nodes: [],

    lineNumbersContainer: $('#line-numbers'),
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
    },

    getRowHTML(row) {
        const li = document.createElement('li');
        li.innerHTML = BufferManager.getRowString(row);

        return li;
    },

    updateCursorPosition() {
        const { row, col } = CursorManager.getCursorPosition();
        const positionText = `${col},${row}`;

        DOMManager.cursorPosition.innerText = positionText;
    },

    updateModeString() {
        DOMManager.mode.innerText = ModeManager.currentMode != 'normal' ? `--${ModeManager.currentMode}--` : '';
    }
}

document.addEventListener('keydown', e => {
    e.preventDefault();
    ModeManager.handleInput(e.key);
    DOMManager.renderHTML();
});
