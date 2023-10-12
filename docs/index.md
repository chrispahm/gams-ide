---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "GAMS-IDE"
  text: "A GAMS extension for VSCode"
  tagline: An open-source, feature rich GAMS-IDE.<br>Fast, customizable, with first class large optimization model support.
  image:
    light: /media/gams-ide-hero.png
    dark: /media/gams-ide-hero-dark.png
    alt: GAMS-IDE
  actions:
    - theme: brand
      text: Get Started
      link: /overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/chrispahm/gams-ide

features:
  - title: All References at a Glance
    icon:
      light: /media/sidebar.png
      dark: /media/sidebar-dark.png
      width: 200
    details: See where a symbol is declared, defined, or referenced in the symbol panel. Quickly observe all places where a parameter is assigned values, or which subsets are defined for a set.
  - title: A Data Panel Right Next to Your Code
    icon:
      light: /media/data-panel.png
      dark: /media/data-panel-dark.png
      width: 200
    details: Display parameter and set values, as well as variable and equation listings in the bottom dock right next to your code.
  - title: Domain Specific Autocomplete
    icon:
      light: /media/autocomplete.png
      dark: /media/autocomplete-dark.png
      width: 200
    details: GAMS-IDE analyzes your code, and automatically suggest sets, subsets, cross-sets, and set elements that are allowed at a given index position. No more "domain violation for set" errors!
  - title: Works with Your Favorite Extensions
    icon:
      light: /media/extensions.png
      dark: /media/extensions-dark.png
      width: 200
    details: Use GitHub Copilot to AI-enhance your model writing skills, the Git extension to version control your model, or the exceptional Python toolchain to make use of the embedded code facility!
---

