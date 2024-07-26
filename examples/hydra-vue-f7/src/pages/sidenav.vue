<template>
      <f7-page>
        <f7-navbar title="Navigation"></f7-navbar>
        <f7-list dividers-ios strong-ios outline-ios>
          <f7-list-item :title="item.title" :link="item['@id'].replace('https://hydra.pretagov.com/', '/').replace('https://hydra.pretagov.com', '/')"   
             v-for="(item) in $root.panelProps.navigation" 
             panel-close/>
        </f7-list>
      </f7-page>
  </template>
  
  <script>
    export default {
      props: {
        data: Object,
      },
    }
  </script>