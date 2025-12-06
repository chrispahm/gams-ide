<script setup>
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'
import { useData } from 'vitepress'

const { isDark } = useData()

import 'vue3-carousel/dist/carousel.css'

import { ref, onMounted } from 'vue'
const myCarousel = ref(null)

const features = [{
  title: 'Symbol Reference Sidebar',
  icon: {
    light: '/feature-sidebar.png',
    dark: '/feature-sidebar-dark.png',
    width: 200
  },
  details: 'See where a symbol is declared, defined, or referenced in the symbol panel. Quickly observe all places where a parameter is assigned values, or which subsets are defined for a set.'
}, {
  title: 'Copilot Integration',
  icon: {
    light: '/feature-data-panel.png',
    dark: '/feature-data-panel-dark.png',
    width: 200
  },
  details: 'Leverage AI assistance directly within your GAMS modeling environment to generate code snippets, optimize model structures, and receive real-time suggestions as you write your models.'
}, {
  title: 'Include File Tree',
  icon: {
    light: '/feature-model-tree.png',
    dark: '/feature-model-tree-dark.png',
    width: 200
  },
  details: 'Visualize the structure and dependencies of your model equations and variables in the model tree.'
},
{
  title: 'Model-aware Autocomplete',
  icon: {
    light: '/feature-autocomplete.png',
    dark: '/feature-autocomplete-dark.png',
    width: 200
  },
  details: 'Get suggestions for symbols in your model, including parameters, sets, variables, and equations.'
}
]


</script>

# Getting Started

GAMS-IDE for VS Code is an extension for integrated [GAMS](https://www.gams.com/) (general algebraic modeling system) development in [Visual Studio Code](https://code.visualstudio.com/). It provides a rich set of features for GAMS modeling, including syntax highlighting, auto-completion, compilation, execution, error detection, and navigation.

This documentation will guide you through the installation, configuration, usage, and migration of the GAMS-IDE extension. You will learn how to set up your VS Code workspace, how to run and debug your GAMS models, how to use the various features of the extension, and how to migrate from GAMS Studio if you are already familiar with it.

::: tip We need your feedback!
We hope that you will enjoy using GAMS-IDE and find it useful for your GAMS modeling projects. GAMS-IDE is open source software, and we welcome contributions from the community. If you have any questions, suggestions, or feedback, please feel free to [open an issue](https://github.com/chrispahm/gams-ide/issues) or start a [discussion](https://github.com/chrispahm/gams-ide/discussions) on Github.
:::

## GAMS-IDE in Action
<div style="background: var(--vp-sidebar-bg-color); padding: 20px; border-radius: 8px;">
  <Carousel :pauseAutoplayOnHover="true" ref="myCarousel" :autoplay="5000" :wrap-around="true" :transition="1000">
    <Slide v-for="slide in features" :key="slide">
      <div class="carousel__item">
        <div style="padding-left: 20px; padding-right: 20px;">
          <img :src="isDark ? slide.icon.dark : slide.icon.light" alt="GAMS-IDE" />
        </div>
      </div>
    </Slide>
    <template #addons="{ currentSlide }">
      <Pagination />
      <h3>{{ features[currentSlide >= features.length ? 0 : currentSlide]?.title }}</h3>
      <p>{{  features[currentSlide >= features.length ? 0 : currentSlide]?.details }}</p>
    </template>
  </Carousel>
</div>


## First Steps

To get the most out of the GAMS-IDE Extension, start by reviewing a few introductory topics:

- [Setup](/setup/installation) - Install VS Code, GAMS, and the GAMS-IDE extension for your platform.
- [Configuration](/configuration/settings) - Configure the GAMS-IDE extension to your needs.
- [Migration](/migration/from-gams-studio) - Migrate from GAMS Studio to GAMS-IDE.