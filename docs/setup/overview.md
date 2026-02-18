# Setting up GGIG-Models

GAMS-IDE is designed to work seamlessly with large-scale GAMS models, such as those often used in the [GGIG](https://www.ilr1.uni-bonn.de/en/research/research-groups/economic-modeling-of-agricultural-systems/ggig) community (e.g., FarmDyn, CAPRI, CGEBOX).

## The "Main GAMS File" Concept

These models typically consist of hundreds or thousands of files. However, execution usually starts from a single entry point, often called the "starter" or "main" file.

GAMS-IDE introduces the concept of a **Main GAMS File** to handle this structure effectively.

*   **What it is**: The file that GAMS-IDE will compile and execute when you press "Run".
*   **Why it helps**: You can be editing a small sub-module deep in the directory structure, but when you check for errors or run the model, GAMS-IDE knows to run the *Main File*, ensuring the context (includes, paths) is correct.

## Supported Models

We have specific guides for setting up the following models:

*   [FarmDyn](./farmdyn)
*   [CAPRI](./capri)
*   [CGEBOX](./cgebox)

These guides will help you configure the correct `mainGmsFile` and other workspace settings for a smooth development experience.