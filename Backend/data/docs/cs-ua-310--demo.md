---
id: "ee37f10a-ca1f-4351-ad6a-89d2f24311b8"
repoId: "cs-ua-310"
userId: "demo"
title: "Intro to Algorithms — My Notes"
course: "CS-UA 310"
professor: "Prof. Siegel"
semester: "Spring 2026"
version: "3.2.1+personal"
tags: ["algorithms", "personal"]
createdAt: "2026-02-21T03:15:24.424Z"
updatedAt: "2026-02-21T09:16:58.399376+00:00"
---

# Intro to Algorithms — My Notes

This document showcases every block type Nootes supports — from plain text and headings to rendered LaTeX, live code, chemistry equations, tables, and callout boxes.

> The art of programming is the art of organizing complexity. — Edsger W. Dijkstra

---

## The Chain Rule

The chain rule is all about composites — "outside-inside." Apply the outer derivative first, then multiply by the inner derivative.

$$
\frac{d}{dx}\bigl[f(g(x))\bigr] = f'(g(x)) \cdot g'(x)
$$

### Example: Differentiating a Composite

Differentiate sin(x²): outer is sin, inner is x².

$$
\frac{d}{dx}\bigl[\sin(x^2)\bigr] = \cos(x^2) \cdot 2x
$$

The General Leibniz Rule extends this to higher-order derivatives of products:

$$
(fg)^{(n)} = \sum_{k=0}^{n} \binom{n}{k} f^{(k)} g^{(n-k)}
$$

:::callout tip
Key insight: we get cos(x²) — the outer derivative evaluated AT the inner function — times 2x, the inner derivative. This pattern repeats for every chain rule problem.
:::

---

## Binary Search

Binary search only works on sorted arrays. The invariant: target is always within [low, high] if it exists.

$$
T(n) = T\!\left(\frac{n}{2}\right) + O(1) \implies T(n) = O(\log n)
$$

```python binary_search.py
 def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
```

:::callout info
Binary search runs in O(log n) time and O(1) space — it never allocates extra memory regardless of input size.
:::

### Complexity Comparison

:::table caption="Time complexity of common search algorithms"
Algorithm, Best Case, Average Case, Worst Case, Space
Linear Search, O(1), O(n), O(n), O(1)
Binary Search, O(1), O(log n), O(log n), O(1)
Hash Table Lookup, O(1), O(1), O(n), O(n)
BST Search, O(1), O(log n), O(n), O(n)
:::

---

## Chemistry: Reaction Equations

The Haber process synthesises ammonia from nitrogen and hydrogen under high pressure and temperature using an iron catalyst:

:::chemistry caption="Haber Process (industrial ammonia synthesis)"
\text{N}_2(g) + 3\,\text{H}_2(g) \;\rightleftharpoons\; 2\,\text{NH}_3(g) \quad \Delta H = -92\,\text{kJ/mol}
:::

Balancing a combustion reaction for methane:

:::chemistry caption="Methane combustion"
\text{CH}_4 + 2\,\text{O}_2 \;\longrightarrow\; \text{CO}_2 + 2\,\text{H}_2\text{O}
:::

---

## Callout Block Showcase

All four callout variants are shown below:

:::callout info
Info — Use this for general background knowledge or definitions. Binary search was first described by John Mauchly in 1946, though correct implementations remained surprisingly rare for decades.
:::

:::callout tip
Tip — Practical advice for exams: always verify the midpoint formula uses integer division to avoid overflow in languages like Java or C.
:::

:::callout warning
Warning — Never apply binary search to an unsorted array. The algorithm silently produces wrong answers without throwing an error — a subtle bug that can be hard to catch.
:::

:::callout important
Important — The recurrence T(n) = T(n/2) + O(1) is only valid when the array is split in half each time. If splits are uneven, worst-case degrades to O(n).
:::

---

## The Quadratic Formula

For any equation ax² + bx + c = 0 with a ≠ 0:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

The discriminant determines the nature of the roots:

$$
\Delta = b^2 - 4ac \implies \begin{cases} \Delta > 0 & \text{two distinct real roots} \\ \Delta = 0 & \text{one repeated root} \\ \Delta < 0 & \text{two complex roots} \end{cases}
$$

```python
def goon():
	hello
```


