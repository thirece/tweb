import { formatPhoneNumber, putPreloader } from "../components/misc";
import Scrollable from '../components/scrollable';
import Countries, { Country as _Country } from "../countries";
import appStateManager from "../lib/appManagers/appStateManager";
import apiManager from "../lib/mtproto/mtprotoworker";
import { App, Modes } from "../lib/mtproto/mtproto_config";
import { RichTextProcessor } from '../lib/richtextprocessor';
import { findUpTag } from "../helpers/dom";
import Page from "./page";
import pageAuthCode from "./pageAuthCode";
import pageSignQR from './pageSignQR';
import InputField from "../components/inputField";
import CheckboxField from "../components/checkbox";
import Button from "../components/button";
import { isAppleMobile } from "../helpers/userAgent";

type Country = _Country & {
  li?: HTMLLIElement[]
};

//import _countries from '../countries_pretty.json';
let btnNext: HTMLButtonElement = null;

let onFirstMount = () => {
  if(Modes.test) {
    Countries.push({
      name: 'Test Country',
      phoneCode: '999 66',
      code: 'TC',
      emoji: '🤔',
      pattern: '999 66 XXX XX'
    });
  
    console.log('Added test country to list!');
  }

  //const countries: Country[] = _countries.default.filter(c => c.emoji);
  const countries: Country[] = Countries.filter(c => c.emoji).sort((a, b) => a.name.localeCompare(b.name));

  let lastCountrySelected: Country = null;

  const inputWrapper = document.createElement('div');
  inputWrapper.classList.add('input-wrapper');

  const countryInputField = new InputField({
    label: 'Country',
    name: 'countryCode',
    plainText: true
  });

  countryInputField.container.classList.add('input-select');

  const countryInput = countryInputField.input as HTMLInputElement;
  countryInput.autocomplete = 'rrRandomRR';

  const selectWrapper = document.createElement('div');
  selectWrapper.classList.add('select-wrapper', 'z-depth-3', 'hide');

  const arrowDown = document.createElement('span');
  arrowDown.classList.add('arrow', 'arrow-down');
  countryInputField.container.append(arrowDown);

  const selectList = document.createElement('ul');
  selectWrapper.appendChild(selectList);

  const scroll = new Scrollable(selectWrapper);

  let initedSelect = false;

  let initSelect = () => {
    initSelect = null;

    countries.forEach((c) => {
      initedSelect = true;

      /* let unified = unifiedCountryCodeEmoji(c.code);
      let emoji = unified.split('-').reduce((prev, curr) => prev + String.fromCodePoint(parseInt(curr, 16)), ''); */
      //let emoji = countryCodeEmoji(c.code);
      let emoji = c.emoji;

      let liArr: Array<HTMLLIElement> = [];
      c.phoneCode.split(' and ').forEach((phoneCode: string) => {
        let li = document.createElement('li');
        var spanEmoji = document.createElement('span');
        /* spanEmoji.innerHTML = countryCodeEmoji(c.code); */
        //spanEmoji.classList.add('emoji-outer', 'emoji-sizer');
        //spanEmoji.innerHTML = `<span class="emoji-inner" style="background: url(${sheetUrl}${sheetNo}.png);background-position:${xPos}% ${yPos}%;background-size:${sizeX}% ${sizeY}%" data-codepoints="${unified}"></span>`;
        
        

        let kek = RichTextProcessor.wrapRichText(emoji);
        //console.log(c.name, emoji, kek, spanEmoji.innerHTML);

        li.appendChild(spanEmoji);
        spanEmoji.outerHTML = kek;
  
        li.append(c.name);

        var span = document.createElement('span');
        span.classList.add('phone-code');
        span.innerText = '+' + phoneCode;
        li.appendChild(span);

        liArr.push(li);
        selectList.append(li);
      });

      c.li = liArr;
    });
    
    selectList.addEventListener('mousedown', function(e) {
      let target = e.target as HTMLElement;
      if(target.tagName != 'LI') target = findUpTag(target, 'LI');
      
      let countryName = target.childNodes[1].textContent;//target.innerText.split('\n').shift();
      let phoneCode = target.querySelector<HTMLElement>('.phone-code').innerText;

      countryInput.value = countryName;
      lastCountrySelected = countries.find(c => c.name == countryName);
      
      telEl.value = lastValue = phoneCode;
      setTimeout(() => telEl.focus(), 0);
      //console.log('clicked', e, countryName, phoneCode);
    });

    countryInputField.container.appendChild(selectWrapper);
  };
  
  initSelect();

  let hideTimeout: number;

  countryInput.addEventListener('focus', function(this: typeof countryInput, e) {
    if(initSelect) {
      initSelect();
    } else {
      countries.forEach((c) => {
        c.li.forEach(li => li.style.display = '');
      });
    }

    clearTimeout(hideTimeout);

    selectWrapper.classList.remove('hide');
    void selectWrapper.offsetWidth; // reflow
    selectWrapper.classList.add('active');
  });
  countryInput.addEventListener('blur', function(this: typeof countryInput, e) {
    selectWrapper.classList.remove('active');
    hideTimeout = window.setTimeout(() => {
      selectWrapper.classList.add('hide');
    }, 200);
    
    e.cancelBubble = true;
  }, {capture: true});

  countryInput.addEventListener('keyup', function(this: typeof countryInput, e) {
    if(e.ctrlKey || e.key == 'Control') return false;

    //let i = new RegExp('^' + this.value, 'i');
    let _value = this.value.toLowerCase();
    let matches: Country[] = [];
    countries.forEach((c) => {
      let good = c.name.toLowerCase().indexOf(_value) !== -1/*  == 0 */;//i.test(c.name);

      c.li.forEach(li => li.style.display = good ? '' : 'none');
      if(good) matches.push(c);
    });

    // Код ниже автоматически выберет страну если она осталась одна при поиске
    /* if(matches.length == 1 && matches[0].li.length == 1) {
      if(matches[0].name == lastCountrySelected) return false;
      //console.log('clicking', matches[0]);

      var clickEvent = document.createEvent('MouseEvents');
      clickEvent.initEvent('mousedown', true, true);
      matches[0].li[0].dispatchEvent(clickEvent);
      return false;
    } else  */if(matches.length == 0) {
      countries.forEach((c) => {
        c.li.forEach(li => li.style.display = '');
      });
    }
  });

  arrowDown.addEventListener('mousedown', function(this: typeof arrowDown, e) {
    e.cancelBubble = true;
    e.preventDefault();
    if(countryInput.matches(':focus')) countryInput.blur();
    else countryInput.focus();
  });

  let pasted = false;
  let lastValue = '';
  
  const telInputField = new InputField({
    label: 'Phone Number',
    plainText: true,
    name: 'phone'
  });
  let telEl = telInputField.input as HTMLInputElement;
  telEl.type = 'tel';
  telEl.autocomplete = 'rr55RandomRR55';
  const telLabel = telEl.nextElementSibling as HTMLLabelElement;
  telEl.addEventListener('input', function(this: typeof telEl, e) {
    //console.log('input', this.value);
    this.classList.remove('error');

    const diff = Math.abs(this.value.length - lastValue.length);
    if(diff > 1 && !pasted && isAppleMobile) {
      this.value = lastValue + this.value;
    }

    pasted = false;

    telLabel.innerText = 'Phone Number';

    let {formatted, country} = formatPhoneNumber(this.value);
    this.value = lastValue = formatted ? '+' + formatted : '';

    //console.log(formatted, country);

    let countryName = country ? country.name : ''/* 'Unknown' */;
    if(countryName != countryInput.value && (!lastCountrySelected || !country || lastCountrySelected.phoneCode != country.phoneCode)) {
      countryInput.value = countryName;
      lastCountrySelected = country;
    }

    //if(country && (this.value.length - 1) >= (country.pattern ? country.pattern.length : 9)) {
    if(country || (this.value.length - 1) > 1) {
      btnNext.style.visibility = '';
    } else {
      btnNext.style.visibility = 'hidden';
    }
  });

  telEl.addEventListener('paste', (e) => {
    pasted = true;
    //console.log('paste', telEl.value);
  });

  /* telEl.addEventListener('change', (e) => {
    console.log('change', telEl.value);
  }); */

  telEl.addEventListener('keypress', function(this: typeof telEl, e) {
    //console.log('keypress', this.value);
    if(!btnNext.style.visibility &&/* this.value.length >= 9 && */ e.key == 'Enter') {
      return btnNext.click();
    } else if(/\D/.test(e.key) && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      return false;
    }
  });

  /* telEl.addEventListener('focus', function(this: typeof telEl, e) {
    this.removeAttribute('readonly'); // fix autocomplete
  });*/

  const signedCheckboxField = CheckboxField('Keep me signed in', 'keepSession');
  signedCheckboxField.input.checked = true;

  btnNext = Button('btn-primary', {text: 'NEXT'});
  btnNext.style.visibility = 'hidden';

  btnNext.addEventListener('click', function(this: HTMLElement, e) {
    this.setAttribute('disabled', 'true');

    this.textContent = 'PLEASE WAIT...';
    putPreloader(this);
    //this.innerHTML = 'PLEASE WAIT...';

    //return;

    let phone_number = telEl.value;
    apiManager.invokeApi('auth.sendCode', {
      phone_number: phone_number,
      api_id: App.id,
      api_hash: App.hash,
      settings: {
        _: 'codeSettings' // that's how we sending Type
      }
      //lang_code: navigator.language || 'en'
    }).then((code) => {
      //console.log('got code', code);

      pageAuthCode.mount(Object.assign(code, {phone_number: phone_number}));
    }).catch(err => {
      this.removeAttribute('disabled');

      this.innerText = 'NEXT';
      switch(err.type) {
        case 'PHONE_NUMBER_INVALID':
          telLabel.innerText = 'Phone Number Invalid';
          telEl.classList.add('error');
          break;
        default:
          console.error('auth.sendCode error:', err);
          this.innerText = err.type;
          break;
      }
    });
  });
  
  const qrDiv = document.createElement('div');
  qrDiv.classList.add('qr');

  const qrLink = document.createElement('a');
  qrLink.href = '#';
  qrLink.classList.add('a-qr');
  qrLink.innerText = 'Quick log in using QR code';

  qrDiv.append(qrLink);

  qrLink.addEventListener('click', () => {
    pageSignQR.mount();
  });

  inputWrapper.append(countryInputField.container, telInputField.container, signedCheckboxField.label, btnNext, qrDiv);

  page.pageEl.querySelector('.container').append(inputWrapper);

  let tryAgain = () => {
    apiManager.invokeApi('help.getNearestDc').then((nearestDcResult) => {
      const dcs = [1, 2, 3, 4, 5];
      const done: number[] = [nearestDcResult.this_dc];

      let promise: Promise<any>;
      if(nearestDcResult.nearest_dc != nearestDcResult.this_dc) {
        promise = apiManager.getNetworker(nearestDcResult.nearest_dc).then(() => {
          done.push(nearestDcResult.nearest_dc)
        });
      }

      (promise || Promise.resolve()).then(() => {
        const g = () => {
          const dcId = dcs.shift();
          if(!dcId) return;

          setTimeout(() => { // * если одновременно запросить все нетворкеры, не будет проходить запрос на код
            apiManager.getNetworker(dcId, {fileDownload: true}).finally(g);
          }, done.includes(dcId) ? 0 : 3000);
        };
        
        g();
      });
      
      return nearestDcResult;
    }).then((nearestDcResult) => {
      let country = countries.find((c) => c.code === nearestDcResult.country);
      if(country) {
        if(!countryInput.value.length && !telEl.value.length) {
          countryInput.value = country.name;
          lastCountrySelected = country;
          telEl.value = lastValue = '+' + country.phoneCode.split(' and ').shift();
        }
      }
  
      //console.log('woohoo', nearestDcResult, country);
    })//.catch(tryAgain);
  };

  tryAgain();
};

const page = new Page('page-sign', true, onFirstMount, () => {
  if(btnNext) {
    btnNext.textContent = 'NEXT';
    btnNext.removeAttribute('disabled');
  }

  appStateManager.pushToState('authState', {_: 'authStateSignIn'});
  appStateManager.saveState();
});

export default page;
