// Output naming.
// "number" | "time" | "number_time"
const OUT_NAMING = "number_time";

// Volume in -dB to be considered "silence"
const SEPARATE_VOLUME = 60;

// Amount of time in seconds to detect of silence before considering a line separate
const SEPARATE_TIME = 0.2;

// Amount of time in seconds to pad around start and end to ensure entire voice line is included.
const PADDING = 0.1;

/// CODE
const execSync = require("child_process").execSync;
const fs = require("fs");

const run = (inputFile) => {
    execSync(
        `ffmpeg -i "${inputFile}" -af silencedetect=noise=-${SEPARATE_VOLUME}dB:d=${SEPARATE_TIME} -f null - 2> noise.txt`
    ).toString();

    const data = fs.readFileSync("noise.txt").toString().split("\n");

    const formatNumber = (num) => {
        let str = num.toString();

        while (str.length < 4) {
            str = "0" + str;
        }

        return str;
    };

    // NOTE: The "end" should be attached to the "start" following it - not the "start" before it.
    const silences = [];

    for (const line of data) {
        const startIndex = line.indexOf("silence_start: ");

        if (startIndex >= 0) {
            const obj = {
                start: line.slice(
                    startIndex + "silence_start: ".length,
                    line.indexOf("\n", startIndex + "silence_start: ".length)
                ),
            };

            if (obj.start === "0") {
                // FFMPEG fails if -to is 0
                continue;
            }

            if (silences.length > 0 && !silences[silences.length - 1].start) {
                silences[silences.length - 1].start = obj.start;
            } else {
                silences.push(obj);
            }

            continue;
        }

        const endIndex = line.indexOf("silence_end: ");

        if (endIndex >= 0) {
            silences.push({
                end: line.slice(
                    endIndex + "silence_end: ".length,
                    line.indexOf(" ", endIndex + "silence_end: ".length)
                ),
            });
            continue;
        }
    }

    const parameters = [];

    for (let i = 0; i < silences.length; i++) {
        const silence = silences[i];

        // Out name
        let outName;

        if (OUT_NAMING === "number") {
            outName = formatNumber(i);
        } else if (OUT_NAMING === "time") {
            outName = `${silence.end}-${silence.start ?? ""}`;
        } else if (OUT_NAMING === "number_time") {
            outName = `${formatNumber(i)}_${silence.end}-${
                silence.start ?? ""
            }`;
        }

        // Out
        if (silence.end) {
            parameters.push(
                `-ss ${Math.max(Number(silence.end) - PADDING, 0)}${
                    silence.start
                        ? ` -to ${Number(silence.start) + PADDING}`
                        : ""
                } -c copy out/${inputFile}/${outName}.wav`
            );
        } else {
            parameters.push(
                `-to ${
                    Number(silence.start) + PADDING
                } -c copy out/${inputFile}/${outName}.wav`
            );
        }
    }

    fs.mkdirSync(`out/${inputFile}`, { recursive: true });

    const MAX_PARAMS = 50;

    for (let i = 0; i < parameters.length; i += MAX_PARAMS) {
        execSync(
            `ffmpeg -i "${inputFile}" ` +
                parameters.slice(i, i + MAX_PARAMS).join(" ")
        ).toString();
    }
};

try {
    const files = fs.readdirSync("in", { recursive: true });

    for (const inputFile of files) {
        // Skip directories
        if (fs.statSync(`in/${inputFile}`).isDirectory()) continue;

        console.log(`Starting ${inputFile}`);
        run(`in/${inputFile}`);
        console.log(`Finished ${inputFile}`);
    }
} catch (e) {
    console.error(e);
    fs.writeFileSync("error.txt", e.toString());
}
