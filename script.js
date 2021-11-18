'use strict';

const form = document.querySelector('.form'),
  containerWorkouts = document.querySelector('.workouts'),
  resetBtn = document.querySelector('.reset'),
  inputType = document.querySelector('.form__input--type'),
  inputDistance = document.querySelector('.form__input--distance'),
  inputTime = document.querySelector('.form__input--time'),
  inputSteps = document.querySelector('.form__input--steps'),
  inputMaxspeed = document.querySelector('.form__input--maxspeed');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, time) {
    this.coords = coords;
    this.distance = distance;
    this.time = time;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _avgSpeed() {
    this.avgSpeed = this.distance / this.time;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, time, steps) {
    super(coords, distance, time);
    this.steps = steps;
    this._setDescription();
    this._avgSpeed();
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, time, maxspeed) {
    super(coords, distance, time);
    this.maxspeed = maxspeed;
    this._setDescription();
    this._avgSpeed();
  }
}

/////////////////////////////////////

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Cannot access GPS');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    this.#map = L.map('map').setView([latitude, longitude], 15);
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach((work) => this._renderWorkout(work));
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(e) {
    this.#mapEvent = e;
    console.log(this.#mapEvent.latlng);
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputTime.value =
      inputSteps.value =
      inputMaxspeed.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleField() {
    inputMaxspeed.closest('.form__row').classList.toggle('form__row--hidden');
    inputSteps.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...input) => input.every((input) => input > 0);
    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const time = +inputTime.value;

    let workout;

    if (type === 'running') {
      const steps = +inputSteps.value;
      if (!validInputs(distance, time, steps))
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, time, steps);
    }

    if (type === 'cycling') {
      const maxspeed = +inputMaxspeed.value;
      if (!validInputs(distance, time, maxspeed))
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, time, maxspeed);
    }

    this.#workouts.push(workout);
    this._hideForm();
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
    this._activateReset();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃🏻' : '🚴🏻'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃🏻' : '🚴🏻'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.time}</span>
          <span class="workout__unit">hour</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⌚️</span>
          <span class="workout__value">${workout.avgSpeed.toFixed(2)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🦶🏻' : '💨'
          }</span>
          <span class="workout__value">${
            workout.type === 'running' ? workout.steps : workout.maxspeed
          }</span>
          <span class="workout__unit">${
            workout.type === 'running' ? 'steps' : 'km/h'
          }</span>
        </div>
      </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _activateReset() {
    resetBtn.classList.remove('hidden');
    resetBtn.addEventListener('click', this.reset.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: {
        duration: 0.5,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    this._activateReset();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
