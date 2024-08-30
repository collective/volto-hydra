/**
 * Personal preferences component.
 * @module components/manage/Preferences/PersonalPreferences
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { map, keys } from 'lodash';
import { withCookies } from 'react-cookie';
import { defineMessages, injectIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { Toast } from '@plone/volto/components';
import { Form } from '@plone/volto/components/manage/Form';
import languages from '@plone/volto/constants/Languages.cjs';
import { changeLanguage } from '@plone/volto/actions';
import { toGettextLang } from '@plone/volto/helpers';
import config from '@plone/volto/registry';
import getSavedURLs from '../../../../utils/getSavedURLs';
import isValidUrl from '../../../../utils/isValidUrl';
import { setFrontendPreviewUrl } from '../../../../actions';

const messages = defineMessages({
  personalPreferences: {
    id: 'Personal Preferences',
    defaultMessage: 'Personal Preferences',
  },
  default: {
    id: 'Default',
    defaultMessage: 'Default',
  },
  language: {
    id: 'Language',
    defaultMessage: 'Language',
  },
  languageDescription: {
    id: 'Your preferred language',
    defaultMessage: 'Your preferred language',
  },
  saved: {
    id: 'Changes saved',
    defaultMessage: 'Changes saved',
  },
  back: {
    id: 'Back',
    defaultMessage: 'Back',
  },
  success: {
    id: 'Success',
    defaultMessage: 'Success',
  },
  frontendUrls: {
    id: 'Frontend URL',
    defaultMessage: 'Frontend URL',
  },
  frontendUrl: {
    id: 'Custom URL',
    defaultMessage: 'Custom URL',
  },
  urlsDescription: {
    id: `Changes the site to visit when in edit mode.`,
    defaultMessage: `Changes the site to visit when in edit mode.`,
  },
  urlDescription: {
    id: `OR Enter your Frontend's base URL`,
    defaultMessage: `OR Enter your Frontend's base URL`,
  },
});

/**
 * PersonalPreferences class.
 * @class PersonalPreferences
 * @extends Component
 */
class PersonalPreferences extends Component {
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
  static propTypes = {
    changeLanguage: PropTypes.func.isRequired,
    closeMenu: PropTypes.func.isRequired,
  };

  /**
   * Constructor
   * @method constructor
   * @param {Object} props Component properties
   * @constructs PersonalPreferences
   */
  constructor(props) {
    super(props);
    this.onCancel = this.onCancel.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.urls = getSavedURLs();
    this.state = {
      hidden: true,
    };
  }

  /**
   * Submit handler
   * @method onSubmit
   * @param {object} data Form data.
   * @returns {undefined}
   */
  onSubmit(data) {
    let language = data.language || 'en';
    if (config.settings.supportedLanguages.includes(language)) {
      const langFileName = toGettextLang(language);
      import('@root/../locales/' + langFileName + '.json').then((locale) => {
        this.props.changeLanguage(language, locale.default);
      });
    }
    toast.success(
      <Toast
        success
        content={''}
        title={this.props.intl.formatMessage(messages.saved)}
      />,
    );
    // Check if the URL is typed in or Selected from dropdown
    if (data.urlCheck) {
      // Custom URL is given
      if (!isValidUrl(data.url)) {
        // Check if the URL is valid
        toast.error(
          <Toast
            error
            content={'Please enter a valid URL or select URL from the options.'}
            title={'Invalid Entered URL!'}
          />,
        );
        return;
      }
      // const url = new URL(data.url);
      const url = data.url.replace(/\/$/, '');
      this.props.setFrontendPreviewUrl(url);
      const urlList = [...new Set([this.urls, url])];
      this.props.cookies.set('saved_urls', urlList.join(','), {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
      });
    } else {
      // URL is selected from the dropdown
      // const url = new URL(data.urls);
      this.props.setFrontendPreviewUrl(data.urls);
    }
    this.props.closeMenu();
  }

  /**
   * Cancel handler
   * @method onCancel
   * @returns {undefined}
   */
  onCancel() {
    this.props.closeMenu();
  }

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
  render() {
    const { cookies } = this.props;
    const urls = this.urls;
    return (
      <Form
        formData={{
          language: cookies.get('I18N_LANGUAGE') || '',
          urls: cookies.get('iframe_url') || '', // Set the default value to the saved URL
        }}
        schema={{
          fieldsets: [
            {
              id: 'default',
              title: this.props.intl.formatMessage(messages.default),
              fields: ['language', 'urls', 'url', 'urlCheck'], // Add the URL field
            },
          ],
          properties: {
            language: {
              description: this.props.intl.formatMessage(
                messages.languageDescription,
              ),
              title: this.props.intl.formatMessage(messages.language),
              type: 'string',
              choices: map(keys(languages), (lang) => [lang, languages[lang]]),
            },
            // Frontend URL fields
            urls: {
              description: this.props.intl.formatMessage(
                messages.urlsDescription,
              ),
              title: this.props.intl.formatMessage(messages.frontendUrls),
              type: 'string',
              choices: map(urls, (url) => [url, url]),
              mode: !this.state.hidden ? 'hidden' : '',
            },
            urlCheck: {
              description: this.props.intl.formatMessage(
                messages.urlDescription,
              ),
              title: this.props.intl.formatMessage(messages.frontendUrl),
              type: 'boolean',
            },
            url: {
              title: this.props.intl.formatMessage(messages.frontendUrl),
              type: 'string',
              mode: this.state.hidden ? 'hidden' : '',
            },
          },
          required: [],
        }}
        onSubmit={this.onSubmit}
        onCancel={this.onCancel}
        onChangeFormData={(newFormData) => {
          // Show/Hide the URL input field based on the checkbox
          if (newFormData.urlCheck) {
            this.setState({ hidden: false });
          } else {
            this.setState({ hidden: true });
          }
          return;
        }}
      />
    );
  }
}

export default compose(
  injectIntl,
  withCookies,
  connect(null, { changeLanguage, setFrontendPreviewUrl }),
)(PersonalPreferences);
