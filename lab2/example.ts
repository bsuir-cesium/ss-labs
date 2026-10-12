let total = 0;
const values: number[] = [1, 2, 3];
const labels = { a: "A", bb: "B" };
for (let i = 0; i < 4; ++i) {
    if (i > 0) {
        switch (i) {
            case 1:
                if (total === 0) {
                    total += 2;
                } else {
                    total += 1;
                }
                break;
            case 2:
                total += 3;
                break;
            case 3:
                total += 4;
                break;
            case 4:
                total += 5;
                break;
            default:
                total += 6;
        }
    } else {
        total += 1;
    }
}
let j = 0;
while (j < 2) {
    total += j;
    ++j;
}
let k = 0;
do {
    total += k;
    ++k;
} while (k < 2);
for (const value of values) {
    total += value;
}
for (const key in labels) {
    total += key.length;
}
if (total < 0) {
    total = 0;
}
console.log(`total = ${total}`);
