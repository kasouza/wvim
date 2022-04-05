# wvim - A vim clone for the web!

WVim is very simple clone of the Vim text editor, with just some of the most basic features (basic movement and opening/closing files).

Take a look at it!

<p align="center">
  <img src="example.gif" />
</p>

## Getting Started:
0. Dowload this project and open the `index.html` file in you browser;
1. When you first start, you'll be in WVim's `normal mode`, here you can't do much, just navigate through the text (you probably don't have any, so kinda useless right now);
2. To start editing, we first need to open a file/buffer, to do so type `:` to enter `command mode` and then type `edit amogus.txt` and press `Enter`, this will create this "file"(not an actual file, more like a buffer that's stored in your browser's local storage) and put you back in `normal mode`;
3. Now we have an open file, but we still can't write nothing, that's because we are in `normal mode` and to write stuff we need to be in `insert mode`. To enter `insert mode` just press `i` or `a` while in `normal mode`;
4. Right now, if you start randomly smashing your keyboard, you should see some letters popping up at the screen. Congratulations, you've done it! 🥳
5. After writing something beautifull you may want to save you work, to do this first you need to go back to `normal mode`, you can do so by pressing `Esc` on you keyboard. Then press `:` to enter `command mode` and type `w` to save your work (this file will be saved in your browser's local storage and can be acessed again by using the `edit` command + the name you gave to fhe file);
6. You may also want to download your file, and it's actually very simple! Just enter the `command mode` and type `wd`.

## Here are the avaiable commands:
### Normal Mode
| Key | Action       |
| --- | ------------ |
| h   | Move left    |
| j   | Move down    |
| k   | Move up      |
| l   | Move rigth   |
| i   | Insert*      |
| a   | Append**     |
| :   | Command Mode |

\*  Enter insert mode in the current character.

** Enter insert mode in the character after the current one.

### Command Mode
| Key              | Action                  |
| ---------------- | ----------------------- |
| w                | Write File              |
| wd               | Write and download file |
| q                | Close file              |
| wq               | Write and close file    |
| edit \<filename> | Edit a file             |
\* Write === Save

All the files you create with the `edit` command are saved in you `local storage`.

Well, there's not much more to say, it's just a little project I made, the code is a bit ugly, it's kinda buggy, but it was fun to make it and i learned some little things, maybe someday I rewrite it using the canvas API or WebGL.
