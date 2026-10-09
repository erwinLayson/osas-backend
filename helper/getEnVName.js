export const getEnvName = (variableName) => {
    const value = process.env[variableName];

    if(value === undefined) {
        throw new Error("Invalid Env name");
    }

    return value;
}