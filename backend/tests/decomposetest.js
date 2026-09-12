
const decomposerange = (ref) => {
    const values = ref.values;

    if (!Array.isArray(values)) {
        return;
    }

    // 1D
    if (!Array.isArray(values[0])) {
        if (values.length === 2) {
            const result = [];

            for (let i = values[0]; i <= values[1]; i++) {
                result.push(i);
            }

            ref.values = result;
        }
        else if (values.length === 3) {
            const result = [];

            for (let i = values[0]; i <= values[1]; i += values[2]) {
                result.push(i);
            }

            ref.values = result;
        }

        return;
    }

    // 2D
    const result = [];

    for (const range of values) {
        const child = { values: range };

        decomposerange(child);

        result.push(...child.values);
    }

    ref.values = result;
};


let ref={ values: [[1, 5,2], [10, 15,10]] }
decomposerange(ref);

console.log(ref.values); // Output: [1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15]