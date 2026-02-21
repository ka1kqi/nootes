---
id: "95e0526c-56b5-4e36-b2cf-8f97e606ecea"
repoId: "math-ua-140"
userId: "master"
title: "Linear Algebra"
course: "MATH-UA 140"
professor: "Prof. Kovalenko"
semester: "Spring 2026"
version: "2.1.0"
contributorCount: 31
tags: ["linear-algebra", "matrices", "eigenvalues"]
createdAt: "2026-02-21T03:15:24.424Z"
updatedAt: "2026-02-21T03:15:24.424Z"
---

# Linear Algebra

Linear algebra is the branch of mathematics that studies vector spaces and linear mappings between them.

## Matrix Multiplication

For matrices $A \in \mathbb{R}^{m \times k}$ and $B \in \mathbb{R}^{k \times n}$, the product $C = AB \in \mathbb{R}^{m \times n}$ is:

$$
C_{ij} = \sum_{r=1}^{k} A_{ir} B_{rj}
$$

## Eigenvalues & Eigenvectors

A scalar $\lambda$ is an eigenvalue of matrix $A$ if there exists a nonzero vector $\mathbf{v}$ (the eigenvector) such that:

$$
A\mathbf{v} = \lambda \mathbf{v}
$$

Eigenvalues are found by solving the characteristic equation:

$$
\det(A - \lambda I) = 0
$$
