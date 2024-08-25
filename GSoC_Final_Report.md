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

This report presents Volto Hydra (volto-hydra), a PoC decoupled editor for Plone CMS. 
While not yet production-ready, Volto Hydra offers a glimpse into the future of headless Plone, enabling developers to seamlessly integrate their preferred frontend technologies with Volto's powerful editing features. 
By leveraging an iframe bridge, we establish a communication channel between the Volto editor and a custom frontend, empowering developers to create tailored experiences without sacrificing the intuitive Volto editing interface. 
This report explores the technical approach, achievements, and future possibilities, providing insights into the effort and benefits of integrating this decoupled editor with your various frontend frameworks.

**Table of content:**

- [Abstract](#abstract)
- [Project Overview](#project-overview)
- [Technical Approach](#technical-approach)
  - [Iframe Bridge Implementation](#iframe-bridge-implementation)
  - [Frontend Integration Strategies (Levels 1-5)](#frontend-integration-strategies-levels-1-5)
  - [Key Challenges and Solutions](#key-challenges-and-solutions)
- [Achievements and Deliverables (what I did \& current State)](#achievements-and-deliverables-what-i-did--current-state)
  - [Working Prototype](#working-prototype)
  - [Codebase and Documentation](#codebase-and-documentation)
  - [Example Frontends](#example-frontends)
- [Future Work and Enhancements (what's left and more)](#future-work-and-enhancements-whats-left-and-more)
- [Conclusion](#conclusion)
- [Acknowledgements](#acknowledgements)

# Project Overview

Volto Hydra addresses a limitation in the current Volto ecosystem - the tight coupling between its frontend and the Plone backend. While Volto offers a powerful and intuitive editing experience, its monolithic architecture can hinder flexibility and performance for projects requiring diverse frontend technologies or specific optimizations. This proof-of-concept introduces a decoupled architecture, empowering developers to leverage their preferred frontend frameworks while retaining the benefits of Volto's visual editing capabilities. 

# Technical Approach

The core of our approach was to create a Volto addon that transforms the traditional Volto editor into a decoupled, headless CMS experience. We achieved this by overlaying the existing block rendering area with an iframe, essentially creating a sandboxed environment for the frontend. This iframe would then host the integrator's custom frontend, decoupled from the Volto.

To bridge the gap between the iframe and the Volto editor, we developed `hydra.js`, a vanilla JavaScript library which is agnostic to the frontend's framework. 
This library is responsible for establishing a two-way communication channel, enabling the seamless exchange of data and events between the frontend and the editor. It also manages the rendering of crucial UI elements, like the block selection overlaying border and the editing toolbar (Quanta toolbar), directly on top of the frontend, ensuring a cohesive and intuitive editing experience.

In essence, we split Volto into two distinct parts: the rendering (handled by the custom frontend in the iframe) and the CMS/Admin UI (provided by Volto Hydra). By maintaining the familiar Volto interface while allowing for a pluggable frontend, we empower developers to leverage their preferred technologies without compromising the editor's power and ease of use. 

## Iframe Bridge Implementation

We chose to build the adminUI/CMSUI as a Volto addon using [cookieplone](https://github.com/plone/cookieplone), a tool well-suited for creating frontend/backend Plone addons. 
To achieve the iframe integration, we developed a custom Iframe component that replaces the traditional BlocksForm in Volto. 
Moreover, we customized some other UI components of Volto by shadowing them so Iframe will take the whole space.
This Iframe component embeds the frontend preview within an iframe and handles communication with the frontend via our custom `hydra.js` library, effectively establishing a two-way link between the iframe and the adminUI. 
By extending the BlocksForm, we ensured that all existing Volto features remained accessible within the new iframe-based editing environment.

**In Short, what the Iframe component does (as one end of the bridge at AdminUI):**

- **Manages the iframe's url and block selection:** It sets the iframe's src URL, adding essential admin params. It also handles interactions with the iframe's content, like block selection and content updates, through message passing. It takes the 'formData' from the volto and pass to the Iframe and thus hydra.js updates the frontend.

- **Facilitates communication between the AdminUI and frontend:** It acts as an one end of the bridge (while the other one is your frontend handled by 'hydra.js'), enabling two-way communication between the Volto editor and the frontend. This allows the adminUI to send commands and receive updates from the frontend, ensuring synchronization.

- **Handles block operations:** On recieving commands from hydra.js, this will insert and delete blocks by leveraging the existing volto methods to add & delete blocks and sends the updated 'formData' to frontend by the bridge, ensuring that the frontend's representation stays updated with the changes made in the Volto interface.

- **Supports inline editing:** It manages the state of inline editing, allowing users to directly edit content within the frontend preview. It also communicates any changes made during inline editing back to the Volto editor.

While the Iframe component handles communication from the Volto editor's perspective, hydra.js acts as the counterpart on the frontend, enabling seamless interaction and data exchange. At its core lies the Bridge class, which orchestrates a wide array of functionalities, ranging from basic setup to complex real-time content manipulation.

**What the Bridge Class does (as other end of the bridge at Frontend)**

- **Initialization and Communication Establishment:** The Bridge class initializes itself within the frontend, establishing a communication channel with the AdminUI. It manages the exchange of messages.

- **Event Handling and Synchronization:** The Bridge class actively listens and sets events at the frontend. This includes handling navigation changes, block selections, content updates, and other interactions, ensuring that the frontend preview accurately reflects the editor's state.

- **Block Selection and Manipulation:** A key aspect of the editing experience is the ability to select and interact with individual blocks on the frontend. The Bridge class handles block selection, highlighting the chosen block and rendering the Quanta toolbar on top of the block. It also facilitates block deselection, resetting the interface and selecting the other block.

- **Content Editing and Data Management:** The Bridge class plays a crucial role in enabling real-time content editing within the frontend. It manages the process of making specific elements editable, observes changes in the content, and sends updates back to the AdminUI to update the backend. Additionally, it handles more intricate tasks like adding and removing node IDs for rich text content to ensure seamless synchronization of the underlying data structure (slate compatible json).

- **Text Formatting and Rich Content Handling:** For rich text elements, the Bridge class provides functionalities to apply and remove formatting (bold, italic, strikethrough), handle inline link creation and modification.

- **UI Integration and Styling:** To maintain a nice visual appearance, the Bridge class injects custom CSS styles into the frontend. This allows for the seamless integration of Volto's UI elements, like the Quanta toolbar, with the custom frontend design.

## Frontend Integration Strategies (Levels 1-5)

The project's design takes a staged approach to frontend integration, offering integrators varying levels of control over the editor's user experience. 
The aim is to enable basic editing with minimal effort while providing the option for more advanced integration to achieve a full inline editing experience similar to Volto.

For an in-depth analysis of each integration level, please refer to the [README.md](https://github.com/collective/volto-hydra/blob/main/README.md#make-your-frontend-editable) file, which provides comprehensive instructions for integrators.
*Our primary goal for this PoC is to simplify the integration process as much as possible.*

Since to understand what amount of work is done during this program and what was the scope of it, understanding the outline of Levels of integration is a bit necessary, so the following is a concise outline of each integration level:

- **Level 1: Enable Switching Pages and Showing Changes After Save**:
    - **Integrator's Tasks** Integrates the hydra.js iframe bridge, establishing a two-way communication link between the Hydra editor and your frontend.
    - **Editor Experience:** Editors can log in, view the frontend in an iframe, navigate within the frontend and Hydra, add and remove pages, and see changes reflected after saving edits.

- **Level 2: Enable Frontend Block Selection and Quanta Toolbar**
   - **Integrator's Tasks** Adds data-block-uid attributes to frontend elements, enabling block selection and rendering the Quanta toolbar for block-level actions.
   - **Editor Experience:** Editors can click on blocks in the frontend preview to select them, triggering the appearance of the Quanta toolbar for actions like adding, deleting, or moving blocks.

- **Level 3: Enable Real-time Changes While Editing**
   - **Integrator's Tasks** Registers the onEditChange callback to receive real-time updates from the Hydra editor.
   - **Editor Experience:** Changes made in the sidebar are instantly reflected in the frontend preview, creating a WYSIWYG-style editing experience without requiring full page reloads.

- **Level 4: Enable Managing Blocks Directly on Your Frontend**
   - **Integrator's Tasks** Builds upon previous levels to allow direct block management on the frontend.
   - **Editor Experience:** Editors can add, remove, drag and drop, and open/close block settings directly within the frontend preview. Future enhancements include cut, copy, paste, multiple block selection, and improved container block handling.

- **Level 5: Enable Visual (Inline) Frontend Editing of Text, Media, and Links**
   - **Integrator's Tasks** Introduces real-time visual editing capabilities for text, media, and links directly on the frontend by adding the data-node-id & data-editable-field attributes to frontend elements.
   - **Editor Experience:** Editors can modify text inline, upload/select media, and manage links visually, further enhancing the editing workflow. Future enhancements include support for character styles, paragraph formatting, markdown shortcuts, rich text pasting, and more.

So, above are the technical approaches we used but if you are interested to know HOW exactly does the hydra.js work then please checkout our [hydra.js](https://github.com/collective/volto-hydra/blob/main/packages/hydra-js/hydra.js), since I tried to keep it nicely documented as much as possible.

## Key Challenges and Solutions

- **Iframe Communicaiton:** A significant initial hurdle was overcoming Cross-Origin Resource Sharing (CORS) errors, which prevented the AdminUI from accessing the frontend's content through the iframe. The solution involved requiring integrators to pass the origin of the AdminUI during the initialization of the Hydra Bridge. This explicit declaration of the trusted origin enabled secure communication between the iframe and the adminUI.

- **Keeping Everything at Sync for realtime updates:** While message passing allowed for data transfer from the AdminUI to the frontend, maintaining synchronization during inline editing posed a challenge. Whenever the `form` data was updated, a `useEffect` hook triggered data transmission to the frontend. However, while editing inline (inside frontend) and data is sent to AdminUI, it caused the AdminUI to send the updated data back to the frontend, leading to a loop of re-renders and loss of focus. To address this and potential future issues, we utilized a `useRef` to create a flag that tracks whether inline editing is active. This flag prevents unnecessary data transmission to the frontend during inline edits, ensuring a smooth and uninterrupted editing experience.

- **Navigating frontend and AdminUI**:Another challenge was ensuring that navigation actions in either the AdminUI or the frontend were reflected in the other. While navigating within the AdminUI and updating the iframe was straightforward, the reverse presented a hurdle. To achieve bi-directional navigation synchronization, we implemented a `detectNavigation()` method that monitors navigation events (like hashchange and popstate) in the iframe and communicates these changes to the AdminUI. This ensures that both the frontend and the AdminUI stay on the same page, providing a cohesive user experience.

- **Translating JSON to HTML and vice-versa**: We have to write our own deserializer to support the conversion of html string to slate compatible json. (In future we can use slate editor if we can link it inside the Iframe component)

# Achievements and Deliverables (what I did & current State)

This section details the accomplishments during the GSoC period and current state of the Volto Hydra project.

As a proof-of-concept, our primary focus was to demonstrate the feasibility of a decoupled Volto editor and its integration with various frontend technologies. While security, efficiency, and accessibility were not the primary concerns at this stage, we aimed to showcase the ease with which integrators can leverage this decoupled approach and highlight the potential of replicating the Volto editing experience in a headless environment.

Our goal was to showcase how integrators can readily leverage a decoupled editor and how the core Volto editing experience can be replicated in a headless environment by utilizing *existing Volto components*. The current prototype supports integration Levels 1 to 3, with partial implementation of Levels 4 and 5, offering a glimpse into the potential of this approach.

Below is a list of currently supported features, along with links to relevant issues where you can find associated pull requests:

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
- [Format buttons shows the status of selected text ie wheather the format is present or not](https://github.com/collective/volto-hydra/issues/31)
- [Convert selected text into link or remove/edit the link if exist](https://github.com/collective/volto-hydra/issues/35)

</details>

## Working Prototype

We successfully developed a working prototype of Volto Hydra, demonstrating the feasibility of decoupling Volto and integrating with various frontend frameworks. The prototype showcased:

- Seamless Navigation: Switching between pages and content within the editor while maintaining context in the frontend.
- Block Selection and Editing: Selecting and editing blocks in the frontend using the Quanta toolbar.
- Real-time Updates: Live updates to the frontend as changes are made in the editor.
- Inline Editing (Partial): Basic inline editing capabilities for text content.

[Youtube Video Integratoed](#)

## Codebase and Documentation

We created a well-structured and documented codebase for Volto Hydra, including:

- [Volto Hydra Addon :](https://github.com/collective/volto-hydra/tree/main/packages/volto-hydra) The core Volto addon that handles the decoupled editing experience.
- [hydra.js :](https://github.com/collective/volto-hydra/blob/main/packages/hydra-js/hydra.js) A JavaScript package for frontend integration, facilitating communication and UI rendering.
- [Documentation :](https://github.com/collective/volto-hydra/blob/main/README.md) Detailed instructions and examples for frontend developers to integrate their projects with Volto Hydra.

## Example Frontends

I developed an example frontend using Nextjs frameworks to demonstrate the integration process and showcase the possibilities of Volto Hydra.

You can find at [`examples`](https://github.com/collective/volto-hydra/tree/main/examples) directory which inlucdes more frontends developed by us.

# Future Work and Enhancements (what's left and more)

While the Volto Hydra prototype demonstrates the potential of decoupled editing for Plone, there are several areas that requires further exploration and enhancement to achieve a fully-fledged, production-ready solution.

- **Complete Inline Editing :** Implementing full-fledged inline editing capabilities for rich text, media, and other content types.
- **Enhanced Performance :** Further optimizing real-time updates and frontend rendering for large and complex pages.
- **Expanded Block Support :** Adding support for a wider range of Volto blocks and custom block types.
- **Improved Accessibility :** Ensuring the decoupled editing experience is accessible to all users.

# Conclusion

Volto Hydra represents a significant step towards a more flexible and adaptable future for Plone CMS. By decoupling the frontend from the backend, we've opened up new possibilities for developers to leverage their preferred technologies while still enjoying the benefits of Volto's intuitive editing experience.

While still in its proof-of-concept stage, Volto Hydra lays a solid foundation for future development. The project highlights the possibilities of headless Plone CMS and sets the stage for further enhancements, ultimately enabling a wider range of developers to build innovative and engaging digital experiences on the Plone platform. We are confident that with continued development and community support, Volto Hydra will play a pivotal role in shaping the future of Plone CMS, making it an even more compelling choice for a diverse range of projects and use cases.


# Acknowledgements

I express my deepest gratitude to my mentors [Dylan Jay](@djay) & [Jeff Bledsoe](@JeffersonBledsoe), whose guidance and expertise were invaluable throughout this journey. Their unwavering support, patience, and positivity towards my work were truly appreciated. They were always willing to clear my doubts, no matter how silly they seemed, and helped me stay on track with the project even when my academic commitments became overwhelming. Their continued availability and encouragement were instrumental in the successful completion of this project.

I also extend my thanks to the Plone community for their feedback, contributions, and enthusiasm for Volto Hydra. Finally, we are grateful to the Google Summer of Code program for providing this incredible opportunity to contribute to the open-source community and learn from experienced developers.