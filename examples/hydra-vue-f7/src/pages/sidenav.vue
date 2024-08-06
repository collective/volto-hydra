<template>
      <f7-page>
        <f7-navbar title="Navigation"></f7-navbar>
        <f7-list dividers-ios strong-ios outline-ios>
          <template  v-for="(item) in navigation" >
            <f7-list-item :title="item.title" :link="item['@id'].replace('https://hydra.pretagov.com/', '/').replace('https://hydra.pretagov.com', '/')"   
             panel-close/>
            <ul v-if="item.items.length">
            <li>
                <f7-list-item :title="item.title" :link="item['@id'].replace('https://hydra.pretagov.com/', '/').replace('https://hydra.pretagov.com', '/')"   
                  v-for="(item) in item.items" panel-close/>
            </li>
            </ul>
          </template>
        </f7-list>
      </f7-page>
  </template>
  
  <script>
    import { useStore } from 'framework7-vue';
    export default {
      props: {
        data: Object,
      },
      data() {      
        return {
          navigation: useStore('navigation'),
        }
      }
    }
  </script>