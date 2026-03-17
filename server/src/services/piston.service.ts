import { config } from '../config/index.js';

interface PistonExecuteRequest {
    language: string;
    version: string;
    files: { name: string; content: string }[];
    stdin?: string;
}

interface PistonExecuteResponse {
    run: {
        stdout: string;
        stderr: string;
        code: number;
        signal: string | null;
        output: string;
    };
    compile?: {
        stdout: string;
        stderr: string;
        code: number;
    };
}

const LANGUAGE_MAP: Record<string, { language: string; version: string; fileName: string }> = {
    javascript: { language: 'javascript', version: '18.15.0', fileName: 'solution.js' },
    python: { language: 'python', version: '3.10.0', fileName: 'solution.py' },
    java: { language: 'java', version: '15.0.2', fileName: 'Main.java' },
    cpp: { language: 'c++', version: '10.2.0', fileName: 'solution.cpp' },
};

export const executeCode = async (
    code: string,
    language: string,
    stdin: string = ''
): Promise<{ output: string; error: string; exitCode: number }> => {
    const langConfig = LANGUAGE_MAP[language];
    if (!langConfig) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const payload: PistonExecuteRequest = {
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: langConfig.fileName, content: code }],
        stdin,
    };

    const response = await fetch(`${config.piston.apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Piston API error: ${response.statusText}`);
    }

    const result = (await response.json()) as PistonExecuteResponse;

    return {
        output: result.run.stdout.trim(),
        error: result.run.stderr || (result.compile?.stderr ?? ''),
        exitCode: result.run.code,
    };
};

export const runTestCases = async (
    code: string,
    language: string,
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[]
): Promise<{
    results: { input: string; expected: string; actual: string; passed: boolean; isHidden: boolean }[];
    passed: number;
    total: number;
}> => {
    const results = [];
    let passed = 0;

    for (const tc of testCases) {
        try {
            const { output, error, exitCode } = await executeCode(code, language, tc.input);
            const isPassed = exitCode === 0 && output.trim() === tc.expectedOutput.trim();
            if (isPassed) passed++;

            results.push({
                input: tc.isHidden ? 'Hidden' : tc.input,
                expected: tc.isHidden ? 'Hidden' : tc.expectedOutput,
                actual: tc.isHidden ? (isPassed ? 'Passed' : 'Failed') : output,
                passed: isPassed,
                isHidden: tc.isHidden,
            });
        } catch (err) {
            results.push({
                input: tc.isHidden ? 'Hidden' : tc.input,
                expected: tc.isHidden ? 'Hidden' : tc.expectedOutput,
                actual: 'Execution Error',
                passed: false,
                isHidden: tc.isHidden,
            });
        }
    }

    return { results, passed, total: testCases.length };
};
