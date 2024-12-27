# Voice Splitter
A simple tool to split long voice files by silences into roughly individual takes. Results may not always be perfect, so checking all the files is a good idea. This can be done easier with the voice handler tool.

Defaults can be modified via the macro variables defined at the very top of split_voice.js if necessary.

To use, simply place a folder called "in" in the same directory as the tool, and put all your audio files in there. Then run split_voices. If you're on Windows, you can run the split_voice.bat file, which just executes split_voice.js with Node.js. Node.js (or similar) is required.