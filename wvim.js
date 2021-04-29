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

const FileManager = {
    currentFile: null,

    hasFileOpen() {
        return FileManager.currentFile != null;
    },

    loadOrCreateFile(filename) {
        const buffer = JSON.parse(localStorage.getItem(filename) || null);
        if(buffer) {
            BufferManager.buffer = buffer;
            FileManager.currentFile = filename;

        } else {
            FileManager.createFile(filename);
        }
    },

    createFile(filename) {
        FileManager.currentFile = filename;
        FileManager.saveFile();
    },

    loadFile(filename) {
        const buffer = JSON.parse(localStorage.getItem(filename) || null);
        if(buffer) {
            BufferManager.buffer = buffer;
            FileManager.currentFile = filename;
        } else {
            alert(`Couldn't load file: ${filename}`);
        }
    },

    saveFile() {
        if(FileManager.currentFile == null) {
            alert('Please, create/load a file before saving');

        } else {
            localStorage.setItem(FileManager.currentFile, JSON.stringify(Utils.getBufferWithoutCursor(BufferManager.buffer)));
        }
    },

    downloadFile() {
        const parsedBuffer = Parser.parseBuffer(BufferManager.buffer);
        const a = document.createElement('a');
        a.href = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(parsedBuffer)
        a.download = FileManager.currentFile;

        $('body').appendChild(a);
        a.click();
        $('body').removeChild(a);
    },

    quit() {
        FileManager.currentFile = null;
    }
};

const Parser = {
    parseBuffer(bufferIn) {
        let result = '';
        for(const row of bufferIn) {
            for(const char of row) {
                result += char;
            }
            result += '\n';
        }

        return result;
    },

    parseCommand(commandIn, commandsObj, separator) {
        const commandList = commandIn.split(separator);
        let result = {};

        for(const commandString of commandList) {
            const command = commandsObj[commandString];
            if(command) {
                let params = [];
                if(command.hasParams) {
                    params = commandList.filter(x => x !== commandString);
                }

                // If more than one command found
                // returns undefined
                if(!result.command && !result.params) {
                    result.command = command;
                    result.params = params;
                }
            }
        }

        return Object.keys(result).length == 0 ? null : result;
    },
};

const NormalCommands = {
    'h': {
        hasParams: true,
        paramCount: 1,

        exec(x) {
            const n = parseInt(x) || 1;
            CursorManager.moveLeft(n, ModeManager.currentMode);
        },
    },

    'j': {
        hasParams: true,
        paramCount: 1,

        exec(x) {
            const n = parseInt(x) || 1;
            CursorManager.moveDown(n, ModeManager.currentMode);
        },
    },

    'k': {
        hasParams: true,
        paramCount: 1,

        exec(x) {
            const n = parseInt(x) || 1;
            CursorManager.moveUp(n, ModeManager.currentMode);
        },
    },

    'l': {
        hasParams: true,
        paramCount: 1,

        exec(x) {
            const n = parseInt(x) || 1;
            const { row, col } = CursorManager.getCursorPosition();
            const length = BufferManager.getRowLength(row) 
            if(n + col < length) {
                CursorManager.moveRigth(n, ModeManager.currentMode);
            }
        },
    },

    'i': {
        hasParams: false,
        paramCount: 0,

        exec() {
            ModeManager.enterInsertMode('before');
        },
    },

    'a': {
        hasParams: false,
        paramCount: 0,

        exec() {
            ModeManager.enterInsertMode('after');
        },
    },
    
    ':': {
        hasParams: false,
        paramCount: 0,

        exec: () => ModeManager.enterCommandMode(),
    }
};

const Commands = {
    w: {
        hasParams: false,
        paramCount: 0,
        
        exec: FileManager.saveFile,
    },

    wd: {
        hasParams: false,
        paramCount: 0,
        
        exec() {
            FileManager.saveFile();
            FileManager.downloadFile();
        },
    },

    q: {
        hasParams: false,
        paramCount: 0,

        exec() {
            BufferManager.clear();
            FileManager.quit();
            CursorManager.reset();
        },
    },

    wq: {
        hasparams: false,
        paramsCount: 0,

        exec() {
            Commands.w.exec();
            Commands.q.exec();
        }
    },

    edit: {
        hasParams: true,
        paramCount: 1,
        
        exec: filename => {
            FileManager.loadOrCreateFile(filename);
            CursorManager.reset();
        }
    },
};

function createBufferManager(defaultValue, eval) {
    return Object.create({
        buffer: defaultValue,
        defaultValue,
        eval,

        append(char) {
            this.buffer += char;
        },

        pop() {
            this.buffer = this.buffer.slice(0, -1);
        },

        isEmpty() {
            return this.buffer.length == 0;
        },

        clear() {
            this.buffer = this.defaultValue;
        }
    });
}

const NormalBufferManager = createBufferManager('', () => {
    const cmdObj = Parser.parseCommand(NormalBufferManager.buffer, NormalCommands, '');
    if(cmdObj && cmdObj.command && cmdObj.params) {
        cmdObj.command.exec(cmdObj.params.join(''));
        NormalBufferManager.clear();
    } else {
        // Handler error comand invalid or somethingA
    }
});

const CommandBufferManager = createBufferManager(':', () => {
    // Reads from CommandBufferManager.buffer and execute the command
    // if possible
    const cmdObj = Parser.parseCommand(CommandBufferManager.buffer.slice(1), Commands, ' ');
    if(cmdObj && cmdObj.command && cmdObj.params) {
        cmdObj.command.exec(...cmdObj.params);

    } else {
        // Handler error comand invalid or somethingA
    }
});

const BufferManager = {
    buffer: [],

    isRowEmpty(row) {
        return BufferManager.buffer[row].length == 0;
    },

    clear() {
        BufferManager.buffer = [];
    },

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
        if(!BufferManager.buffer[row] ||
            (BufferManager.buffer[row][col] && BufferManager.buffer[row][col].innerText != undefined)) return;

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
};

const CursorManager = {
    col: 0,
    row: 0,

    reset() {
        CursorManager.col = 0;
        CursorManager.row = 0;
    },

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
            CursorManager.row = Math.min(BufferManager.getBufferLength() - 1, CursorManager.row + n);

            let rowLength = BufferManager.getRowLength(CursorManager.row)
            if(!BufferManager.isRowEmpty(CursorManager.row)) {
                rowLength -= 1;
            }

            CursorManager.col = Math.min(rowLength, CursorManager.col);
        });
    },

    moveUp(n) { 
        Utils.updateCursor(() => {
            CursorManager.row = Math.max(CursorManager.row - n, 0);

            let rowLength = BufferManager.getRowLength(CursorManager.row)
            if(!BufferManager.isRowEmpty(CursorManager.row)) {
                rowLength -= 1;
            }

            CursorManager.col = Math.min(rowLength, CursorManager.col);
        });
    },

    moveRigth(n) {
        Utils.updateCursor(() => {
            CursorManager.col = Math.min(BufferManager.getRowLength(CursorManager.row), CursorManager.col + n);
        });
    }
};

const ModeManager = {
    modes: ['normal', 'insert', 'command'],
    currentMode: 'normal',

    excludedKeys: [
        'Shift', 'Tab', 'Alt', 'CapsLock', 'End', 'Home',
        'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown',
        'Delete', 'Insert', 'Dead', 'Control', 'AltGraph',
        'PageDown', 'PageUp', 'NumLock', 'Unidentified',

    ],

    handleInput(key) {
        const mode = ModeManager[ModeManager.currentMode];
        if(mode && !ModeManager.excludedKeys.includes(key)) {
            mode(key);
        }
    },

    enterCommandMode() {
        ModeManager.currentMode = 'command';
        BufferManager.removeCursor();
    },

    enterNormalMode() {
        const { row, col } = CursorManager.getCursorPosition();
        ModeManager.currentMode = 'normal';

        if(!BufferManager.isBufferEmpty() && Utils.isCursor(BufferManager.buffer[row][col])
            && !BufferManager.buffer[row][col].shouldRender) {
            BufferManager.removeCursor();
        } 
        BufferManager.updateCursor();
    },

    enterInsertMode(positionIn) {
        if(!FileManager.hasFileOpen()) {
            alert(`Please, open a file with before start editing.
                Use :edit <filename>`);
            return;
        }

        if(BufferManager.isBufferEmpty()) {
            BufferManager.createRow();
        }

        const pos = ModeManager.insertModePositions[positionIn];
        if(pos) {
            pos();
            ModeManager.currentMode = 'insert';
        }
    },

    command(key) {
        const specialKeyAction = ModeManager.commandSpecialKeys[key];
        if(specialKeyAction) {
            specialKeyAction();
        } else {
            CommandBufferManager.append(key);
        }
    },

    normal(key) {
        NormalBufferManager.append(key);
        NormalBufferManager.eval();
    },

    insert(key) {
        const specialAction = ModeManager.insertSpecialKeys[key];
        if(specialAction) {
            specialAction();
        } else {
            BufferManager.insertCharAt(key, CursorManager.getCursorPosition());
            CursorManager.moveRigth(1);
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

    commandSpecialKeys: {
        'Escape': () => {
            ModeManager.enterNormalMode();
            CommandBufferManager.clear();
        },

        'Enter': () => {
            CommandBufferManager.eval();
            ModeManager.enterNormalMode();
            CommandBufferManager.clear();
        },

        'Backspace': () => {
            CommandBufferManager.pop();

            if(CommandBufferManager.isEmpty()) {
                ModeManager.enterNormalMode();
                CommandBufferManager.clear();
            }
        },
    },

    insertSpecialKeys: {
        'Escape': () => {
            CursorManager.moveLeft(1);
            ModeManager.enterNormalMode();
        },

        'Enter': () => {
            // All these bois here need to be in that exact order
            const {row,col} = CursorManager.getCursorPosition();
            BufferManager.createRow(row + 1);

            const afterCursor = BufferManager.sliceRow(row, col);
            if(afterCursor.length > 0 && !(Utils.isCursor(afterCursor[0]) && !afterCursor[0].shouldRender)) {
                BufferManager.spliceRow(row, col);
                BufferManager.appendList(row + 1, afterCursor);
                CursorManager.moveLeft(BufferManager.getRowLength(row));
            }

            CursorManager.moveDown(1);
        },

        'Backspace': () => {
            const {row, col} = CursorManager.getCursorPosition();

            if(!BufferManager.doRowExist(row)) return;

            if(BufferManager.removeRowIfEmpty(row)) {
                if(row === 0) return;

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
};

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

    getBufferWithoutCursor(buffer) {
        return buffer.map(e => Utils.isCursor(e) ? e.innerText : e);
    },

    updateCursor(cb) {
        BufferManager.removeCursor();
        cb();
        BufferManager.updateCursor();
    }
};

const DOMManager = {
    filename: $('#filename'),
    command: $('#command'),
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


        DOMManager.updateCommandString();
        DOMManager.updateCursorPosition();
        DOMManager.updateFilename();
    },

    getRowHTML(row) {
        const li = document.createElement('li');
        li.innerHTML = BufferManager.getRowString(row);

        return li;
    },

    updateCursorPosition() {
        const { row, col } = CursorManager.getCursorPosition();
        const positionText = `${col + 1},${row + 1}`;

        DOMManager.cursorPosition.innerText = positionText;
    },

    updateCommandString() {
        if(ModeManager.currentMode != 'command') {
            DOMManager.command.innerText = ModeManager.currentMode != 'normal' ? `--${ModeManager.currentMode}--` : '';

        } else {
            DOMManager.command.innerText = CommandBufferManager.buffer;
        }
    },

    updateFilename() {
        DOMManager.filename.innerText = FileManager.currentFile || '';
    }
};

if(BufferManager.isBufferEmpty()) {
    BufferManager.createRow();
    DOMManager.renderHTML();
}

document.addEventListener('keydown', e => {
    e.preventDefault();
    ModeManager.handleInput(e.key);
    DOMManager.renderHTML();
});

// TODO change the way keys are 'captured'
//document.addEventListener('keypress', e => {
//    e.preventDefault();
//    console.log(e);
//});
