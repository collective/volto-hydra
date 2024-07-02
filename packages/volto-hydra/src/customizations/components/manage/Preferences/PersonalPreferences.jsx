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
import languages from '@plone/volto/constants/Languages';
import { changeLanguage } from '@plone/volto/actions';
import { toGettextLang } from '@plone/volto/helpers';
import config from '@plone/volto/registry';
import getSavedURLs from '../../../../utils/getSavedURLs';
import isValidUrl from '../../../../utils/isValidUrl';

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
    id: 'Select Frontend URL',
    defaultMessage: 'Select Frontend URL',
  },
  frontendUrl: {
    id: 'Enter Frontend URL',
    defaultMessage: 'Enter Frontend URL',
  },
  urlsDescription: {
    id: `Select your Frontend's base URL`,
    defaultMessage: `Select your Frontend's base URL`,
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
    if (data.urlCheck) {
      if (!isValidUrl(data.url)) {
        toast.error(
          <Toast
            error
            content={'Please enter a valid URL or select URL from the options.'}
            title={'Invalid Entered URL!'}
          />,
        );
        return;
      }
      const urlList = [...new Set([this.urls, data.url])];
      this.props.cookies.set('saved_urls', urlList.join(','), {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
      });
      console.log('data.url', data.url);
    } else {
      console.log('data.urls', data.urls);
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
          urls: cookies.get('iframe_url') || '',
        }}
        schema={{
          fieldsets: [
            {
              id: 'default',
              title: this.props.intl.formatMessage(messages.default),
              fields: ['language'],
            },
            {
              id: 'frontend',
              title: 'Frontend',
              fields: ['urls', 'url', 'urlCheck'],
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
  connect(null, { changeLanguage }),
)(PersonalPreferences);
