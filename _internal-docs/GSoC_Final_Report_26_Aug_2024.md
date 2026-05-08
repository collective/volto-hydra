<!-- # Google Summer of Code'24 Final Report -->

<p align="center">
    <a href="https://summerofcode.withgoogle.com/"> <img width="129" alt="Screenshot 2023-08-19 at 8 04 04 PM" src="https://user-images.githubusercontent.com/20709817/261828661-dc4977c3-5a20-4761-9e9a-aba21fccc8cf.png"> </a>
</p>

<p align="center">
  <span style="font-size: 30px;"><b>Google Summer of Code'24 Final Report </b></span>
</p>

<p align="center">
    <img width="274" alt="Screenshot 2023-08-19 at 8 05 03 PM" src="https://user-images.githubusercontent.com/20709817/261828663-36ed72cd-0a06-45f2-87d0-ec31a0fedc48.png">
</p>

#### **Project Title**: [Decoupled editor for Plone headless](https://github.com/plone/volto/issues/5767) | [GSoC page](https://summerofcode.withgoogle.com/programs/2024/projects/DCkAHbio)
#### **Mentors**: [Dylan Jay](@djay) , [Jeff Bledsoe](@JeffersonBledsoe)
#### **Student**: [Mohammad Hussain](@MAX-786)

# Abstract

This report details the development of a proof-of-concept (PoC) Volto addon to turn Plone Volto into a decoupled editor for Headless Plone. The goal of the project was to show that decoupling Volto from the frontend is technically possible without losing any editor experience and while keeping the integrator's experience easy. Additionally, we aimed to demonstrate that many parts of Volto can be reused to completely decouple it, allowing it to be used solely as the AdminUI, with the frontend hosted separately.

The project was successful in showing that the existing UI can be replicated in a way that performs well, proving that this approach is feasible and the editor experience remains the same. This report covers all the significant deliverables during this period, as well as the technical approaches and difficulties faced during the project.

**Table of content:**

- [Abstract](#abstract)
- [Project Overview](#project-overview)
- [Technical Approach](#technical-approach)
  - [Iframe Bridge Implementation](#iframe-bridge-implementation)
  - [Frontend Integration Strategies (Levels 1-5)](#frontend-integration-strategies-levels-1-5)
- [Achievements and Deliverables (what I did \& current State)](#achievements-and-deliverables-what-i-did--current-state)
    - [Deliverables](#below-is-a-list-of-currently-supported-features-along-with-links-to-relevant-issues-where-you-can-find-associated-pull-requests)
  - [Key Challenges and Solutions](#key-challenges-and-solutions)
  - [Working Prototype](#working-prototype)
  - [Codebase and Documentation](#codebase-and-documentation)
  - [Example Frontends](#example-frontends)
- [Future Work and Enhancements (what's left and more)](#future-work-and-enhancements-whats-left-and-more)
- [Conclusion](#conclusion)
- [Acknowledgements](#acknowledgements)


# Project Overview

Volto Hydra addresses a limitation in the current Volto ecosystem - the tight coupling between its frontend and the Plone backend. While Volto offers a powerful and intuitive editing experience, its monolithic architecture can hinder flexibility and performance for projects requiring diverse frontend technologies or specific optimizations.

Volto Hydra serves as a proof-of-concept. Our primary intention was not to deliver a fully polished, production-ready addon for immediate inclusion in the Plone core. Instead, it demonstrates to the Volto core development team that decoupling the frontend is technically possible without sacrificing the editing experience and features of Volto. 

# Technical Approach

The core of our approach for this PoC was to create a Volto addon that transforms the traditional Volto editor into a decoupled, headless CMS experience. I achieved this by shadowing the existing block rendering area with an iframe. This iframe would then host the integrator's custom frontend, decoupled from the Volto.

*Note:* In the following sections I'll be refering this volto-hydra addon as 'AdminUI' which is hosting the frontend inside an iframe. Also, 'integrator' refers to the frontend developer and 'editor' is for the end user who is going to use your deployed volto-hydra to edit the content.

To bridge the gap between the iframe and the AdminUI, we developed `hydra.js`, a vanilla JS package which is agnostic to the frontend's framework. 
This package is included by the integrator at the frontend side and is responsible for establishing a two-way communication channel, enabling the seamless exchange of data and events between the frontend and the AdminUI. It also manages the rendering of crucial UI elements, like the block selection overlaying border and the editing toolbar (Quanta toolbar), directly on top of the frontend, ensuring a cohesive and intuitive editing experience.

In essence, we split Volto into two distinct parts: the rendering (handled by the custom frontend in the iframe) and the CMS/Admin UI (provided by Volto Hydra). By maintaining the familiar Volto interface while allowing for a pluggable frontend, we empower developers to leverage their preferred technologies without compromising the editor's power and ease of use. 

## Iframe Bridge Implementation

Firstly, I chose to build the adminUI/CMSUI as a Volto addon using [cookieplone](https://github.com/plone/cookieplone), a tool well-suited for creating frontend/backend Plone addons. 
To achieve the iframe integration, we developed a custom Iframe component that replaces the traditional BlocksForm in Volto. 

Moreover, after some discussions from my mentors and their inputs, I customized some other UI components of Volto (like Breadcrumbs.jsx, Login, View, Add, Form, Preferences, App) by shadowing them, so Iframe will take the whole space.

This Iframe component embeds the frontend preview within an iframe and handles communication with the frontend via our custom `hydra.js` package (included at the frontend side), effectively establishing a two-way link between the iframe and the adminUI. 
By extending the BlocksForm, we ensured that all existing Volto features remained accessible within the new iframe-based editing environment.

## Frontend Integration Strategies (Levels 1-5)

The project's design takes a staged approach to frontend integration, offering integrators varying levels of control over the editor's user experience. 
The aim is to enable basic editing with minimal effort while providing the option for more advanced integration to achieve a full inline editing experience similar to Volto.

For an in-depth analysis of each integration level, please refer to the [README.md](https://github.com/collective/volto-hydra/blob/main/README.md#make-your-frontend-editable) file, which provides comprehensive instructions for integrators.
*Our primary goal for this PoC is to simplify the integration process as much as possible.*

Since to understand what amount of work is done during this program and what was the scope of it, understanding the outline of each Level of integration is a bit necessary, so the following is a concise outline:

- **Level 1: Enable Switching Pages and Showing Changes After Save**

- **Level 2: Enable Frontend Block Selection and Quanta Toolbar**

- **Level 3: Enable Real-time Changes While Editing**

- **Level 4: Enable Managing Blocks Directly on Your Frontend**

- **Level 5: Enable Visual (Inline) Frontend Editing of Text, Media, and Links**

So, above are the technical approaches we used but if you are interested to know HOW exactly does the hydra.js work then please check out my [hydra.js](https://github.com/collective/volto-hydra/blob/main/packages/hydra-js/hydra.js), since I tried to keep it nicely documented as much as possible.


# Achievements and Deliverables (what I did & current State)

This section details the accomplishments during the GSoC period and current state of the Volto Hydra project.

You can directly check the [last subsection](#below-is-a-list-of-currently-supported-features-along-with-links-to-relevant-issues-where-you-can-find-associated-pull-requests) of this section if you just want to see the deliverables, otherwise below is the weekly distribution of deliverables done in this GSoC period (12 weeks + bonding period).

So, during the community bonding period, we initiated discussions on how to approach this project and opted for an Agile development methodology, which was something like:

```
REQUIREMENTS ---> PLANNING ---> DEVELOPMENT ---> DEPLOYMENT
                     ▲                                |
                     |        weekly iterations       |         
                     └────────────────────────────────┘
```
So in the bonding period, we finalized the "REQUIREMENTS" by documenting user stories from the editor's perspective during 2-3 weekly meets. In this phase, I drafted initial user stories, which were then refined and broken down into smaller, technically implementable tasks by my mentors, each estimated to take 3-4 days and thus creating a Roadmap for 12 weeks of upcoming coding days.
In the last week of bonding period, after some discussions with Jeff I initiated the addon using `cookieplone` and set up the coding environment to start with handling the basic user stories.

So, below is a compilation of each week's development process where we do a weekly meet deciding the the tasks needed to be done by me and once the development is done Dylan had setup the deployment, so we check what features will be available for the editor after each week iteration.

You can find the long list of all the user stories (including out-of-scope ones) at [Hydra Project](https://github.com/orgs/collective/projects/3/views/1).

So below is a list of deliverables by me grouped by 2-2 weeks (otherwise list will get quite long) and also includes compilation of what was discussed.

**WEEKS 1-2:**
- Implemented login functionality, initially using cookies for token access but later switched to URL parameters based on discussions with Dylan so that integrator is not required to include the 'hydrajs' just for accessing the private content through AdminUI.
- Deciding the UI for the URL input field which we kept on top of the iframe in main screen.
- Deliverables: 
  - Login to see the private content.
  - Volto addon which hides the 'BlocksForm' and displayed IFrame on top of it.
  - Breadcrumbs and all the other UI components were remained intact for now.
  - Kept URL input field at top of iframe which onSubmit will update the iframe.

**WEEKS 3-4:**
- With this week I started on navigation with some discussion with Dylan, it was a quite tricky part as keeping the adminUI at same path as frontend without knowing How routing is happening inside frontend.
- After some inputs from Dylan, handled CORS error while sending or receiving postMessages b/w hydra & adminUI by asking integrators to provide 'origin' of the adminUI while initializing the bridge.
- Deliverables:
  - Altered 'Add.jsx' to open an existing modal to enter title (and other meta-data) of the page before adding it.
  - Initiated 'hydrajs' with some methods like 'constructor', 'init()' etc.
  - Setup 'hydrajs' to send postMessage to adminUI whenever the path of the frontend is changed using 'navigation' event.

**WEEKS 5-6:**
- By now I got a good understanding of volto core, and thus we started discussion on realtime updates.
- Other part was volto's latest 'Order Tab' which introduced block nav tree and Jeff gave us the heads-up about the current state of this and updated the addon to support it.
- Deliverables:
  - Created a hook (onEditChange) for the integrator which will take the callback and call it with the updated Data whenever the data is changed in the adminUI.
  - I also updated the Iframe component at AdminUI, so it sends the formData whenever it is changed (useEffect) via postMessage and then it is received by the hydrajs (onEditChange).
  - Started working out on how block selection in iframe will work.
  - UI design of QuataToolbar is discussed with the mentors.
  - With Jeff's help, I altered the slate block using the `blocksConfig` and added an input field to add content in the block from sidebar.
  - Dylan updated the integrators instructions for enabling realtime update

**WEEKS 7-8:**
- After having realtime update of the data, we discussed the block selection directly from the iframe, so for this we decided that integrator just put an attribute 'data-block-uid=...' at the outermost parent of the block. 
- In this iteration, we discussed the scope of many issues and re-arranged the tasks according to the priority.
- Dylan & Jeff discussed inline editing, and the approach to track text changes in block.
- Deliverables:
  - I created a method in 'hydrajs' to select block by looking for the described attribute whenever the click event is happened and sending this to AdminUI, where 
  - I used existing `onSelectBlock()` function received as a prop from Edit.jsx component and also setting the sidebar to tab 1 by dispatching a redux action.
  - Border design around a Block is discussed with mentors after which I wrote a method in hydrajs to inject CSS into the frontend and designed the basic border around block using CSS.
  - created a toolbar (without format btns, just drag btn & dropdown menu) by writing the `createQuantaToolbar()` method, and the design was based on Quanta design after inputs from my mentors and attached it on top of the selected block.

**WEEKS: 9-10:**
- This week we prioritized to having the ability to add/remove blocks from the frontend.
- Initially I tried writing my own `onAddBlock()` to provide a dropdown for choosing block's type but as our aim was to reuse the existing parts of Volto, I reused `BlockChooser` component.
- Deliverables:
  - Created an Add button based on the design discussed by the mentors and wrote necessary methods to handle the click event and send the proper messages across to the AdminUI
  - At adminUI side, I reused the `BlockChooser` component, to render it on top of iframe using `usePopper` to correctly align it and thus keeping the editor experience intact.
  - re-using `addBlock` & `deleteBlock` functions from volto helpers to add & delete blocks and sending updated 'formData' to the frontend.

**WEEKS: 11-12:**
- At the final weeks of our project we finally came to inline editing, while this was discussed during last 3-4 weeks and some work was done on this side-by-side of the other tasks.
- Inline editing includes, editing text blocks, formatting/un-formatting (bold, italic, del) selected text, adding/editing link inline.
- Even after having a way to keep both sides at sync major problem I faced was that once the updated data is sent from frontend to adminUI it updates the 'formData' and thus again triggering the message event to send it to frontend and creating a rendering loops, to fix this I used a flag using 'useRef' so we do not send data when editing inline.
- Deliverables:
  - As discussed with Dylan, instructions for integrators were updated for inline editing.
  - Based on the instructions I constructed the methods in 'hydrajs' to make selected block editable based on the block's type and also add nodeIds to slate compatible json to keep track of the text edited inline.
  - Wrote methods to format/un-format the text and also to figure out if the current cursor is on formatted text or not.
  - Wrote a method to link/un-link the selected text and also re-used the `withObjectBrowser` hoc by creating a new empty fragment component `OpenObjectBrowswer` to open and let the editor add the link from the objectBrowser in sidebar.
  - formatting methods works by doing what 'execCommand' does and sending the updated HTML of the selected text to the adminUI.
  - Created a custom deserializer to convert this htmlString to json and sending back to frontend.

Above are the major accomplishments we achieved during this project and there are more which you can check out by going through the Below list.

### Below is a list of currently supported features, along with links to relevant issues where you can find associated pull requests:

<details>
<summary>Frontend navigation, add/remove pages, see content and more </summary>

- [Login to volto-hydra and this will pass auth token to let your frontend access private content](https://github.com/collective/volto-hydra/issues/6)
- [Choose which frontend to edit](https://github.com/collective/volto-hydra/issues/7)
- [Add/remove new pages](https://github.com/collective/volto-hydra/issues/11)
- [Go to content view and select the page you want to edit and Iframe will load that page in frontend.](https://github.com/collective/volto-hydra/issues/10)
- [epic](https://github.com/collective/volto-hydra/issues/1)
</details>

<details>
<summary>Edit content using the sidebar and see changes on save (Sidebar/ edit mode)</summary>

- [Enter edit mode and open sidebar](https://github.com/collective/volto-hydra/issues/13)
- [Edit title of the page from sidebar](https://github.com/collective/volto-hydra/issues/15)
- [Click on Save Button to save current changes](https://github.com/collective/volto-hydra/issues/17)
- [Click on Cancel to cancel](https://github.com/collective/volto-hydra/issues/18)
- [Edit text of a block from sidebar](https://github.com/collective/volto-hydra/issues/16)
- [Add image in image block from sidebar](https://github.com/collective/volto-hydra/issues/19)
- [epic](https://github.com/collective/volto-hydra/issues/2)

</details>

<details>
<summary>Realtime data update</summary>

- [On Edit mode, edit the title of page from sidebar and see the realtime update in the frontend.](https://github.com/collective/volto-hydra/issues/39)
- [Change the text in sidebar and see the realtime update.](https://github.com/collective/volto-hydra/issues/21)
- [Add image from the sidebar and see it appear in realtime in frontend.](https://github.com/collective/volto-hydra/issues/22)
- [epic](https://github.com/collective/volto-hydra/issues/3)

</details>

<details>
<summary>Manage blocks inside the iframe</summary>

- [Click on a block inside iframe to open its configuration in sidebar.](https://github.com/collective/volto-hydra/issues/23)
- [Show a border around a block when clicked](https://github.com/collective/volto-hydra/issues/24)
- [Quanta toolbar on top of selected block](https://github.com/collective/volto-hydra/issues/25)
- [Add block using add button (+)](https://github.com/collective/volto-hydra/issues/27)
- [Remove block by clicking on 'Remove' inside the quantaToolbar dropdown](https://github.com/collective/volto-hydra/issues/26)
- [epic](https://github.com/collective/volto-hydra/issues/4)

</details>

<details>
<summary>Edit blocks INLINE</summary>

- [On the frontend, Click on text block to edit it](https://github.com/collective/volto-hydra/issues/28)
- [Text from the block and sidebar remains in sync](https://github.com/collective/volto-hydra/issues/29)
- [Format buttons (bold, italic, del) appear on toolbar when richtext block is selected](https://github.com/collective/volto-hydra/issues/88)
- [Format/un-Format text by clicking on the format button](https://github.com/collective/volto-hydra/issues/32)
- [Format buttons shows the status of selected text ie whether the format is present or not](https://github.com/collective/volto-hydra/issues/31)
- [Convert selected text into link or remove/edit the link if exist](https://github.com/collective/volto-hydra/issues/35)
- [epic](https://github.com/collective/volto-hydra/issues/5)

</details>

## Key Challenges and Solutions

- **Iframe Communication:** A significant initial hurdle was overcoming Cross-Origin Resource Sharing (CORS) errors, which prevented the AdminUI from accessing the frontend's content through the iframe. The solution involved requiring integrators to pass the origin of the AdminUI during the initialization of the Hydra Bridge. This explicit declaration of the trusted origin enabled secure communication between the iframe and the adminUI.

- **Keeping Everything at Sync for realtime updates:** While message passing allowed for data transfer from the AdminUI to the frontend, maintaining synchronization during inline editing posed a challenge. Whenever the `form` data was updated, a `useEffect` hook triggered data transmission to the frontend. However, while editing inline (inside frontend) and data is sent to AdminUI, it caused the AdminUI to send the updated data back to the frontend, leading to a loop of re-renders and loss of focus. To address this and potential future issues, we utilized a `useRef` to create a flag that tracks whether inline editing is active. This flag prevents unnecessary data transmission to the frontend during inline edits, ensuring a smooth and uninterrupted editing experience.

- **Navigating frontend and AdminUI**:Another challenge was ensuring that navigation actions in either the AdminUI or the frontend were reflected in the other. While navigating within the AdminUI and updating the iframe was straightforward, the reverse presented a hurdle. To achieve bidirectional navigation synchronization, we implemented a `detectNavigation()` method that monitors navigation events (like hashchange and popstate) in the iframe and communicates these changes to the AdminUI. This ensures that both the frontend and the AdminUI stay on the same page, providing a cohesive user experience.

- **Translating JSON to HTML and vice-versa**: We have to write our own deserializer to support the conversion of html string to slate compatible json. (In future we can use slate editor if we can link it inside the Iframe component)


## Working Prototype

Checkout this demo presentation here in which I included the features provided by volto-hydra from editor's pov:

*Note:* Demonstration is in local instance of hydra BUT you can try out deployed hydra by yourself at : [VOLTO-HYDRA](https://hydra.pretagov.com/)

[<img src="https://img.youtube.com/vi/8m4y0lA_JGY/0.jpg" width="240" height="180" ></img>](https://youtu.be/8m4y0lA_JGY)



## Codebase and Documentation

We created a well-structured and documented codebase for Volto Hydra, including:

- [Volto Hydra Addon :](https://github.com/collective/volto-hydra/tree/main/packages/volto-hydra) The core Volto addon that handles the decoupled editing experience.
- [hydra.js :](https://github.com/collective/volto-hydra/blob/main/packages/hydra-js/hydra.js) A JavaScript package for frontend integration, facilitating communication and UI rendering.
- [Documentation :](https://github.com/collective/volto-hydra/blob/main/README.md) Detailed instructions and examples for frontend developers to integrate their projects with Volto Hydra.

## Example Frontends

I developed an example frontend using Nextjs frameworks to demonstrate the integration process and showcase the possibilities of Volto Hydra.

You can find at [`examples`](https://github.com/collective/volto-hydra/tree/main/examples) directory which includes more frontends developed by the people to try out the current hydra!

# Future Work and Enhancements (what's left and more)

While the Volto Hydra prototype demonstrates the potential of decoupled editing for Plone, there are several areas that require further exploration and enhancement to achieve a fully-fledged, production-ready solution.

- **Complete Inline Editing :** Implementing full-fledged inline editing capabilities for rich text, media, and other content types.
- **Enhanced Performance :** Further optimizing real-time updates and frontend rendering for large and complex pages.
- **Expanded Block Support :** Adding support for a wider range of Volto blocks and custom block types.
- **Improved Accessibility :** Ensuring the decoupled editing experience is accessible to all users.

# Conclusion

This project aimed to showcase that creating a headless editor agnostic to the frontend's framework is technically possible and can be done with keeping the editor's features intact without creating much hassle for the integrator.
In conclusion, this project successfully demonstrated that Volto's UI can be preserved even when different frameworks are used for the frontend. Furthermore, it highlighted the potential for reusing Volto components to build a headless CMS.

As this being of PoC nature, this project does not provide production-ready code but rather showcases the *possibility* of a decoupled editor built on top of Volto, which still provides all the basic editing experiences and easy integration steps. While time constraints prevented us from implementing all planned features, we successfully showcased all the major editing features.

*If this PoC can intrigue the community and enough love is shown, Volto-Hydra is not very far off in the future.*

# Acknowledgements

I express my deepest gratitude to my mentors [Dylan Jay](@djay) & [Jeff Bledsoe](@JeffersonBledsoe), whose guidance and expertise were invaluable throughout this journey. Their unwavering support, patience, and positivity towards my work were truly appreciated. They were always willing to clear my doubts, no matter how silly they seemed, and helped me stay on track with the project even when my academic commitments became overwhelming. Their continued availability and encouragement were instrumental in the successful completion of this project.

I also extend my thanks to the Plone community for their feedback, contributions, and enthusiasm for Volto Hydra. Finally, we are grateful to the Google Summer of Code program for providing this incredible opportunity to contribute to the open-source community and learn from experienced developers.