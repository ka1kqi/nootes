---
id: "8c90199f-0217-4e32-a598-afe442a8b918"
repoId: "cs-ua-310"
userId: "master"
title: "Intro to Algorithms"
course: "CS-UA 310"
professor: "Prof. Siegel"
semester: "Spring 2026"
version: "3.2.1"
contributorCount: 47
tags: ["algorithms", "exam-relevant", "midterm", "derivatives"]
createdAt: "2026-02-21T03:15:24.424Z"
updatedAt: "2026-02-21T03:15:24.424Z"
---

# Intro to Algorithmssss

This master document is maintained by the community. Fork it to your personal workspace, add your own notes, and contribute back through the merge pipeline.

## The Chain Rule

Let $f$ and $g$ be differentiable functions. Then the composite function $f \circ g$ is differentiable, and

$$
\frac{d}{dx}\bigl[f\bigl(g(x)\bigr)\bigr] = f'\bigl(g(x)\bigr) \cdot g'(x)
$$

### Worked Example

Find $\frac{d}{dx}[\sin(x^2)]$. Let $f(u) = \sin(u)$ and $g(x) = x^2$. Then:

$$
\frac{d}{dx}\bigl[\sin(x^2)\bigr] = \cos(x^2) \cdot 2x
$$

## Binary Search

A classic $O(\log n)$ search algorithm on a sorted array. Repeatedly halves the search interval.

```python binary_search.py
def binary_search(arr, target):
    """Search for target in sorted array.

    Time:  O(log n)
    Space: O(1)
    """
    low, high = 0, len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1  # not found
```

### Complexity Comparison

:::table caption="Table 1. Search algorithm complexities"
Algorithm,Best,Average,Worst,Space
Linear Search,O(1),O(n),O(n),O(1)
Binary Search,O(1),O(log n),O(log n),O(1)
Hash Table,O(1),O(1),O(n),O(n)
:::

---

## Chemistry Cross-Domain

:::chemistry caption="Haber Process"
\text{N}_2 + 3\text{H}_2 \rightleftharpoons 2\text{NH}_3 \quad (\Delta H = -92.4\;\text{kJ/mol})
:::
