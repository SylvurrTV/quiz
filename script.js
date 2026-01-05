// Load JSON data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStarted = false; // Track if the quiz has started
const scores = {}; // Keep track of scores for each result

// Fetch quiz data
fetch(quizFile)
  .then(response => {
    if (!response.ok) {
      console.error("Failed to load quiz data:", response.statusText);
      alert("Failed to load quiz data.");
      return;
    }
    return response.json();
  })
  .then(data => {
    // Set the title dynamically from the JSON file
    document.title = data.title || 'Quiz';

    // Initialize results scores
    for (const result in data.results) {
      scores[result] = 0;
    }

    // Store the quiz data in local storage to use later for submitting
    localStorage.setItem('quizData', JSON.stringify(data));

    // Render the landing page
    renderLandingPage(data);
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the landing page
function renderLandingPage(data) {
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h1>${data.title}</h1>
    ${data.landingImage ? `<img src="${data.landingImage}" alt="Quiz Image" style="max-width: 100%; height: auto;">` : ""}
    <p>${data.description || ''}</p>
    <button id="play-btn" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Play</button>
  `;

  // Add event listener to the play button
  document.getElementById("play-btn").addEventListener("click", () => {
    quizStarted = true;
    renderQuestion(JSON.parse(localStorage.getItem('quizData')));
  });

  // Hide navigation buttons initially
  document.getElementById("prev-btn").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";
}

// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];

  // Render question text and image (if available)
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    <div>
      ${question.type === 'rank' ? `
        <ul id="rank-list">
          ${question.options
            .map(
              (option, index) => `
                <li data-index="${index}" class="rank-option">${option.text}</li>`
            )
            .join('')}
        </ul>
      ` : question.options
        ? question.options
            .map(
              (option, index) => `
                <label>
                  <input type="radio" name="answer" value="${index}" />
                  ${option.text}
                </label><br/>
              `
            )
            .join("")
        : ""}
    </div>
    ${question.type === 'slider' ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    ` : ''}
  `;

  // Add functionality to make the rank list draggable
  if (question.type === 'rank') {
    const rankList = document.getElementById("rank-list");
    if (rankList) {
      new Sortable(rankList, {
        animation: 150,  // smooth animation for reordering
        onEnd(evt) {
          // Save the new order
          const newOrder = Array.from(rankList.children).map(child => child.dataset.index);
          userAnswers[currentQuestionIndex] = newOrder;
        }
      });
    }
  }

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";

  // Add slider value update functionality
  if (question.type === 'slider') {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.addEventListener('input', (event) => {
      sliderValue.textContent = event.target.value;
    });
  }
}

function saveAnswer() {
  const question = JSON.parse(localStorage.getItem('quizData')).questions[currentQuestionIndex];

  // For rank questions, make sure the order has been set
  if (question.type === 'rank') {
    if (!userAnswers[currentQuestionIndex] || userAnswers[currentQuestionIndex].length === 0) {
      return false; // No ranking done yet
    }
  }
  // For slider questions, ensure a value is selected
  else if (question.type === 'slider') {
    const slider = document.getElementById('slider');
    if (!slider) return false; // If no slider, return false
    userAnswers[currentQuestionIndex] = slider.value;
  }
  // For multiple-choice questions, ensure an answer is selected
  else if (question.type === 'multiple-choice') {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return false; // No answer selected, return false
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  }

  return true; // Return true if the answer was saved successfully
}



// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion(JSON.parse(localStorage.getItem('quizData')));
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion(JSON.parse(localStorage.getItem('quizData')));
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  const quizData = JSON.parse(localStorage.getItem('quizData')); // Ensure quizData is loaded correctly
  const results = quizData.results;

  // Initialize scores for the results (using dynamic labels from JSON)
  const scores = {};
  Object.keys(results).forEach(result => {
    scores[result] = 0; // Initialize all result categories
  });

  // Calculate the score based on the user's answers
  userAnswers.forEach((answer, index) => {
    const question = quizData.questions[index];

    // For multiple-choice questions
    if (question.type === 'multiple-choice') {
      const selectedOption = question.options[answer];
      if (selectedOption) {
        for (const result in selectedOption.scores) {
          scores[result] = (scores[result] || 0) + selectedOption.scores[result];
        }
      }
    }

    // For slider questions
    else if (question.type === 'slider') {
      const scoreImpact = question.scoreImpact;
      const sliderValue = parseInt(answer); // The slider answer is saved as a value
      if (sliderValue >= question.min && sliderValue <= question.max) {
        for (const result in scoreImpact) {
          const scoreRange = scoreImpact[result];
          const score = scoreRange[0] + ((scoreRange[1] - scoreRange[0]) * (sliderValue - question.min)) / (question.max - question.min);
          scores[result] = (scores[result] || 0) + score;
        }
      }
    }

    // For rank questions
    else if (question.type === 'rank') {
      answer.forEach((rankObj) => {
        if (rankObj.optionIndex >= 0 && rankObj.optionIndex < question.options.length) {
          const option = question.options[rankObj.optionIndex];
          const rankPosition = rankObj.rank;

          if (option.scores[rankPosition]) {
            const rankScore = option.scores[rankPosition];
            for (const result in rankScore) {
              scores[result] = (scores[result] || 0) + rankScore[result];
            }
          }
        }
      });
    }
  });

  // Calculate total score to compute percentages
  const totalScore = Object.values(scores).reduce((total, score) => total + score, 0);

  // Calculate percentages for each result
  const percentages = Object.keys(scores).map(result => ({
    name: result,
    percentage: (scores[result] / totalScore) * 100,
    value: scores[result]
  }));

  // Sort results by percentage in descending order
  percentages.sort((a, b) => b.percentage - a.percentage);

  // Display the result
  const highestScoreResult = percentages[0].name;
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
    <div style="text-align: center;">
      <canvas id="result-pie-chart" width="300" height="300"></canvas>
      <div id="pie-chart-percentages" style="margin-top: 15px;"></div>
    </div>
  `;

  // Ensure the canvas element exists before initializing the chart
  const ctx = document.getElementById('result-pie-chart').getContext('2d');
  if (ctx) {
    // Generate a list of 15 distinct colors for the pie chart
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#FFD633', '#33FFF9',
      '#A633FF', '#FFB533', '#33FF90', '#FF3365', '#33A6FF', '#75FF33',
      '#FF8333', '#B833FF', '#33FFDE'
    ];

    // Create the pie chart
    const resultPieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: percentages.map(p => p.name), // Use sorted result names
        datasets: [{
          label: 'Result Distribution',
          data: percentages.map(p => p.percentage), // Use sorted percentages
          backgroundColor: colors.slice(0, percentages.length), // Assign colors dynamically
          borderColor: colors.slice(0, percentages.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(tooltipItem) {
                const label = tooltipItem.label;
                const value = tooltipItem.raw.toFixed(2) + '%';
                return label + ': ' + value;
              }
            }
          },
          legend: {
            position: 'top',
          }
        }
      }
    });

    // Display the percentages below the chart
    const percentageContainer = document.getElementById('pie-chart-percentages');
    percentages.forEach(p => {
      const percentageText = document.createElement('p');
      percentageText.innerHTML = `${p.name}: ${p.percentage.toFixed(2)}%`;
      percentageContainer.appendChild(percentageText);
    });
  } else {
    console.error('Error: The canvas element is missing or cannot be accessed.');
  }

  // Hide the next, previous, and submit buttons
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("prev-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";
});
