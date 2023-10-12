import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "GAMS-IDE",
  description: "Documentation for the VSCode gams-ide extension",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/overview' },
      { text: 'VSCode Marketplace', link: 'https://marketplace.visualstudio.com/vscode' }
    ],
    base: '/gams-ide/',
    editLink: {
      pattern: 'https://github.com/chrispahm/gams-ide/edit/main/docs/:path'
    },
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Installation', link: '/overview' },
          { 
            text: 'Configuration',  
            items: [
              {
                text: "Settings",
                link: '/configuration/settings'
              },
              {
                text: "Main GMS file",
                link: '/configuration/main-gms-file'
              },
              {
                text: "Data panel",
                link: '/configuration/data-panel'
              }
            ]
          },
          {
            text: "Setting up GGIG-Models",
            collapsed: true,
            items: [
              {
                text: "Overview",
                link: '/setup/overview'
              },
              {
                text: "FarmDyn",
                link: '/setup/farmdyn'
              },
              {
                text: "CAPRI",
                link: '/setup/capri'
              },
              {
                text: "CGEBOX",
                link: '/setup/cgebox'
              }
            ]
          },
          {
            text: "Usage",
            items: [
              {
                text: "Overview",
                link: '/usage/overview'
              },
              {
                text: "Compiling and executing GAMS",
                link: '/usage/compiling-and-executing-gams'
              },
              {
                text: "Finding compilation errors",
                link: '/usage/finding-compilation-errors'
              },
              {
                text: "Using the GAMS References sidebar",
                link: '/usage/gams-references-sidebar'
              },
              {
                text: "Using the GAMS Data Panel",
                link: '/usage/gams-data-panel'
              },
              {
                text: "Switching main GMS files",
                link: '/usage/switching-main-gms-files'
              }
            ]
          },
          {
            text: "Migration",
            collapsed: true,
            items: [
              {
                text: "From GAMS Studio",
                link: '/migration/from-gams-studio'
              }
            ]
          }
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
