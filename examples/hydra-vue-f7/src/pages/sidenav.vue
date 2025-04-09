<template>
      <f7-page>
        <f7-navbar title="Navigation"></f7-navbar>
        <f7-list dividers-ios strong-ios outline-ios>
          <f7-list-item title="Home" link="/" panel-close/>
          <template  v-for="(item) in navigation" >
            <f7-list-item :title="item.title" :link="getUrl(item)"   
             panel-close/>
            <ul v-if="item.items.length">
            <li>
                <f7-list-item :title="item.title" :link="getUrl(item)"   
                  v-for="(item) in item.items" panel-close/>
            </li>
            </ul>
          </template>
        </f7-list>
      </f7-page>
  </template>
  
  <script>
    import { useStore } from 'framework7-vue';
    const runtimeConfig = useRuntimeConfig();
    export default {
      props: {
        data: Object,
      },
      methods: {
        getUrl(item) {
          return item['@id'].replace(runtimeConfig.public.backendBaseUrl+'/', '/').replace(runtimeConfig.public.backendBaseUrl, '/')
        }
      },
      data() {      
        return {
          navigation: useStore('navigation'),
        }
      }
    }
  </script>