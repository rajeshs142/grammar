// Global variables
let config = null;
let currentTest = [];
let userAnswers = [];
let currentMode = "test"; // 'test' or 'view'
let loadedTopics = {}; // Cache for loaded topic questions
let testHistory = []; // Store test history
let leftPaneCollapsed = false;

// Settings with defaults
const settings = {
  shuffleQuestions: true,
  shuffleOptions: true,
  compactMode: true,
  showExplanations: true,
  autoSubmit: false,
  autoCollapse: true,
};

// DOM Elements
const loadingMessage = document.getElementById("loadingMessage");
const testContainer = document.getElementById("testContainer");
const printBtn = document.getElementById("printBtn");
const topicsContainer = document.getElementById("topics-container");
const topicSelect = document.getElementById("topicSelect");
const leftPane = document.getElementById("leftPane");
const rightPane = document.getElementById("rightPane");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const historyModal = document.getElementById("historyModal");
const historyContent = document.getElementById("historyContent");

// Initialize the application
window.onload = async function () {
  // Load settings from localStorage
  loadSettings();

  // Load configuration
  await loadConfig();

  // Generate navigation from config
  generateNavigation();
  populateTopicSelect();

  // Apply compact mode if enabled
  applyCompactMode();

  // Load test history
  loadTestHistory();

  // Set up auto-collapse for mobile
  setupAutoCollapse();

  // Show full test by default
  await generateCustomTest();
};

// Load configuration from config.json
async function loadConfig() {
  try {
    const response = await fetch("./data/config.json");
    config = await response.json();
    console.log("Configuration loaded:", config);
  } catch (error) {
    console.error("Error loading config:", error);
    // Fallback to default config if file not found
    config = getDefaultConfig();
  }
}

// Default configuration
function getDefaultConfig() {
  return {
    topics: [
      {
        id: "tenses",
        name: "Tenses",
        file: "tenses.json",
        weightage: 25,
      },
      {
        id: "modals",
        name: "Modals",
        file: "modals.json",
        weightage: 10,
      },
      {
        id: "voice",
        name: "Active & Passive Voice",
        file: "voice.json",
        weightage: 15,
      },
      {
        id: "reportedspeech",
        name: "Reported Speech",
        file: "reportedspeech.json",
        weightage: 15,
      },
      {
        id: "subjectverb",
        name: "Subject-Verb Agreement",
        file: "subjectverb.json",
        weightage: 10,
      },
      {
        id: "prepositions",
        name: "Prepositions",
        file: "prepositions.json",
        weightage: 8,
      },
      {
        id: "determinersarticles",
        name: "Determiners & Articles",
        file: "determinersarticles.json",
        weightage: 7,
      },
      {
        id: "conjunctions",
        name: "Conjunctions",
        file: "conjunctions.json",
        weightage: 5,
      },
      {
        id: "reordering",
        name: "Sentence reordering",
        file: "reordering.json",
        weightage: 5,
      },
    ],
    testConfigs: {
      fullTest: {
        distribution: {
          tenses: 3,
          modals: 1,
          voice: 2,
          reportedspeech: 2,
          subjectverb: 1,
          prepositions: 1,
          conjunctions: 1,
          determinersarticles: 1,
          reordering: 1
        },
      },
    },
  };
}

// Load settings from localStorage
function loadSettings() {
  const savedSettings = localStorage.getItem("grammarPracticeSettings");
  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    Object.assign(settings, parsedSettings);

    // Update checkboxes
    document.getElementById("shuffleQuestions").checked = settings.shuffleQuestions;
    document.getElementById("shuffleOptions").checked = settings.shuffleOptions;
    document.getElementById("compactMode").checked = settings.compactMode;
    document.getElementById("showExplanations").checked = settings.showExplanations;
    document.getElementById("autoSubmit").checked = settings.autoSubmit;
    document.getElementById("autoCollapse").checked = settings.autoCollapse;

    // Load left pane state
    const savedLeftPaneState = localStorage.getItem("leftPaneCollapsed");
    if (savedLeftPaneState === "true") {
      toggleLeftPane(true);
    }
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("grammarPracticeSettings", JSON.stringify(settings));
  localStorage.setItem("leftPaneCollapsed", leftPaneCollapsed.toString());
}

// Apply compact mode styling
function applyCompactMode() {
  if (settings.compactMode) {
    document.body.classList.add("compact-mode");
  } else {
    document.body.classList.remove("compact-mode");
  }
}

// Set up auto-collapse for mobile
function setupAutoCollapse() {
  if (settings.autoCollapse && window.innerWidth <= 768) {
    toggleLeftPane(true);
  }

  // Add resize listener
  window.addEventListener("resize", function () {
    if (settings.autoCollapse && window.innerWidth <= 768 && !leftPaneCollapsed) {
      toggleLeftPane(true);
    } else if (window.innerWidth > 768 && leftPaneCollapsed) {
      toggleLeftPane(false);
    }
  });
}

// Toggle left pane
function toggleLeftPane(forceState) {
  if (forceState !== undefined) {
    leftPaneCollapsed = forceState;
  } else {
    leftPaneCollapsed = !leftPaneCollapsed;
  }

  if (leftPaneCollapsed) {
    leftPane.classList.add("collapsed");
    rightPane.classList.add("expanded");
    hamburgerBtn.textContent = "☰";
  } else {
    leftPane.classList.remove("collapsed");
    rightPane.classList.remove("expanded");
    hamburgerBtn.textContent = "✕";
  }

  saveSettings();
}

// Load test history from localStorage
function loadTestHistory() {
  const savedHistory = localStorage.getItem("grammarTestHistory");
  if (savedHistory) {
    testHistory = JSON.parse(savedHistory);
  }
}

// Save test history to localStorage
function saveTestHistory() {
  localStorage.setItem("grammarTestHistory", JSON.stringify(testHistory));
}

// Show test history modal
function showTestHistory() {
  if (testHistory.length === 0) {
    historyContent.innerHTML =
      "<p>No test history available. Complete a test to see your history.</p>";
  } else {
    historyContent.innerHTML = `
      <div style="margin-bottom: 15px;">
          <p><strong>Total Tests Taken:</strong> ${testHistory.length}</p>
          <p><strong>Average Score:</strong> ${calculateAverageScore()}%</p>
      </div>
      <table class="history-table">
          <thead>
              <tr>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Score</th>
                  <th>Questions</th>
                  <th>Accuracy</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>
              ${testHistory
                .map(
                  (test, index) => `
                  <tr>
                      <td>${test.date}</td>
                      <td>${getTopicName(test.topic)}</td>
                      <td>${test.score}/${test.total}</td>
                      <td>${test.questionIds.length}</td>
                      <td>${calculateTestAccuracy(test)}%</td>
                      <td>
                          <button class="review-btn" onclick="reviewTest(${index})">Review</button>
                          <button class="review-btn" onclick="retakeTest(${index})" style="background: #9b59b6; margin-left: 5px;">Retake</button>
                      </td>
                  </tr>
              `
                )
                .join("")}
          </tbody>
      </table>
      <div style="text-align: center; margin-top: 15px;">
          <button class="btn" onclick="clearTestHistory()" style="background: #e74c3c; color: white;">Clear History</button>
      </div>
  `;
  }
  historyModal.style.display = "flex";
}

// Helper function to calculate average score
function calculateAverageScore() {
  if (testHistory.length === 0) return 0;
  const totalPercentage = testHistory.reduce((sum, test) => {
    return sum + (test.score / test.total) * 100;
  }, 0);
  return Math.round(totalPercentage / testHistory.length);
}

// Helper function to calculate test accuracy
function calculateTestAccuracy(test) {
  let correctCount = 0;
  test.userAnswers.forEach((answer, index) => {
    if (answer === test.correctAnswers[index]) {
      correctCount++;
    }
  });
  return Math.round((correctCount / test.questionIds.length) * 100);
}

// Function to retake the same test
async function retakeTest(testIndex) {
  const test = testHistory[testIndex];
  
  // Require questionTopics array
  if (!test.questionTopics) {
    alert("This test was taken with an older version and cannot be retaken. Please take a new test.");
    closeHistoryModal();
    return;
  }
  
  closeHistoryModal();
  showLoading();

  // Load questions from all topics and create a lookup map by topic and id
  const allQuestionsMap = {};

  for (const topicConfig of config.topics) {
    const topicQuestions = await loadTopicQuestions(topicConfig.id);
    topicQuestions.forEach((q) => {
      const key = `${topicConfig.id}_${q.id}`;
      allQuestionsMap[key] = { ...q, topic: topicConfig.id };
    });
  }

  // Get the questions in order using both topic and id
  currentTest = [];
  test.questionIds.forEach((questionId, index) => {
    const questionTopic = test.questionTopics[index];
    const key = `${questionTopic}_${questionId}`;
    const question = allQuestionsMap[key];
    
    if (question) {
      currentTest.push(question);
    } else {
      console.warn(`Question not found: ${key}`);
    }
  });

  // Ensure we have all questions
  if (currentTest.length !== test.questionIds.length) {
    alert(`Warning: Could only load ${currentTest.length} out of ${test.questionIds.length} questions.`);
  }

  userAnswers = new Array(currentTest.length).fill(null);

  // Update header for retake
  document.querySelector(".header-content h2").textContent = `Retake Test - ${test.date}`;
  document.querySelector(".header-content p").textContent = `${currentTest.length} Questions | Based on previous test`;

  updatePrintButton();
  renderTest();
  hideLoading();
}

// Function to clear test history
function clearTestHistory() {
  if (confirm("Are you sure you want to clear all test history? This action cannot be undone.")) {
    testHistory = [];
    saveTestHistory();
    closeHistoryModal();
    showTestHistory(); // Refresh the modal
  }
}

// Close history modal
function closeHistoryModal() {
  historyModal.style.display = "none";
}

// Review a specific test from history
async function reviewTest(testIndex) {
  const test = testHistory[testIndex];
  
  // Require questionTopics array
  if (!test.questionTopics) {
    alert("This test was taken with an older version and cannot be reviewed. Please take a new test.");
    return;
  }
  
  closeHistoryModal();
  showLoading();

  // Load questions from all topics and create a lookup map by topic and id
  const allQuestionsMap = {};

  for (const topicConfig of config.topics) {
    const topicQuestions = await loadTopicQuestions(topicConfig.id);
    topicQuestions.forEach((q) => {
      const key = `${topicConfig.id}_${q.id}`;
      allQuestionsMap[key] = { ...q, topic: topicConfig.id };
    });
  }

  // Get the actual questions in order using both topic and id
  const orderedQuestions = [];
  test.questionIds.forEach((questionId, index) => {
    const questionTopic = test.questionTopics[index];
    const key = `${questionTopic}_${questionId}`;
    const question = allQuestionsMap[key];
    
    if (question) {
      orderedQuestions.push(question);
    } else {
      // Create a placeholder if question not found
      orderedQuestions.push({
        id: questionId,
        question: `[Question ${questionId} - Data not available]`,
        options: ["Data not loaded"],
        answer: test.correctAnswers[index] || "Unknown",
        explanation: "Original question data could not be loaded.",
        marks: 1,
        question_type: "unknown",
        difficulty: "unknown",
        topic: questionTopic
      });
    }
  });

  // Display the review
  let reviewHTML = `
    <div class="question-card">
        <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">Test Review - ${test.date}</h2>
        <p style="font-size: 18px; margin-bottom: 30px; text-align: center;">
            Score: <strong style="color: #e74c3c">${test.score}/${test.total}</strong> | 
            Topic: <strong>${getTopicName(test.topic)}</strong>
        </p>
  `;

  orderedQuestions.forEach((question, index) => {
    const userAnswer = test.userAnswers[index];
    const correctAnswer = test.correctAnswers[index];
    const isCorrect = userAnswer === correctAnswer;

    reviewHTML += `
      <div class="question-item" style="margin-bottom: 15px; padding: 12px; border: 2px solid ${
        isCorrect ? "#2ecc71" : "#e74c3c"
      }; border-radius: 8px;">
          <div class="question-header">
              <div class="question-number">Question ${index + 1}</div>
              <div class="question-meta">
                  <span>${question.marks || 1} Mark${(question.marks || 1) > 1 ? "s" : ""}</span>
                  <span class="">${question.difficulty || "Medium"}</span>
                  <span>${question.question_type || "Multiple Choice"}</span>
                  ${question.topic ? `<span>Topic: ${getTopicName(question.topic)}</span>` : ""}
              </div>
          </div>
          
          <div class="question-text">${question.question}</div>
          
          <div class="options-container">
              ${question.options
                .map((option, optIndex) => {
                  let optionClass = "option";
                  if (option === correctAnswer) {
                    optionClass += " correct";
                  }
                  if (option === userAnswer && !isCorrect) {
                    optionClass += " incorrect";
                  }
                  return `
                      <div class="${optionClass}">
                          ${String.fromCharCode(65 + optIndex)}. ${option}
                      </div>
                  `;
                })
                .join("")}
          </div>
          
          <div style="margin: 10px 0;">
              <div>Your answer: <span style="color: ${isCorrect ? "#2ecc71" : "#e74c3c"}">${
      userAnswer || "Not attempted"
    }</span></div>
              <div>Correct answer: <span style="color: #2ecc71">${correctAnswer}</span></div>
              ${!isCorrect && userAnswer ? `<div>Status: <span style="color: #e74c3c">Incorrect</span></div>` : ""}
              ${isCorrect ? `<div>Status: <span style="color: #2ecc71">Correct</span></div>` : ""}
              ${!userAnswer ? `<div>Status: <span style="color: #f39c12">Not attempted</span></div>` : ""}
          </div>
          
          ${
            settings.showExplanations && question.explanation
              ? `
              <div class="explanation">
                  <strong>Explanation:</strong> ${question.explanation}
              </div>
          `
              : ""
          }
      </div>
  `;
  });

  reviewHTML += `
    <div style="text-align: center; margin-top: 25px;">
        <button class="btn btn-primary" onclick="generateCustomTest()">Take New Test</button>
        <button class="btn history-btn" onclick="showTestHistory()" style="margin-left: 10px;">Back to History</button>
    </div>
  </div>`;

  testContainer.innerHTML = reviewHTML;
  hideLoading();
}

// Get topic name from ID
function getTopicName(topicId) {
  console.log("topic name: ", topicId);
  if (topicId === "all") return "All Topics";
  const topic = config.topics.find((t) => t.id === topicId);
  console.log("topic", topic);
  console.log(config);
  return topic ? topic.name : "Mixed Topics";
}

// Generate navigation dynamically from config
function generateNavigation() {
  if (!config || !config.topics) return;

  topicsContainer.innerHTML = config.topics
    .map(
      (topic) => `
          <div class="topic-line">
              <div class="topic-links">
                  <span class="topic-name">${topic.name}</span>
                  <div class="topic-actions">
                      <a href="#" class="topic-link" onclick="showTopicQuestions('${topic.id}')">View</a>
                      <span style="color: #7f8c8d">|</span>
                      <a href="#" class="topic-link" onclick="showTopicTest('${topic.id}')">Test</a>
                  </div>
              </div>
          </div>
      `
    )
    .join("");
}

// Populate topic select dropdown
function populateTopicSelect() {
  if (!config || !config.topics) return;

  topicSelect.innerHTML =
    '<option value="all">All Topics</option>' +
    config.topics.map((topic) => `<option value="${topic.id}">${topic.name}</option>`).join("");
}

// Show loading state
function showLoading() {
  loadingMessage.style.display = "block";
  testContainer.style.opacity = "0.5";
}

// Hide loading state
function hideLoading() {
  loadingMessage.style.display = "none";
  testContainer.style.opacity = "1";
}

// Generate custom test based on form inputs
async function generateCustomTest() {
  currentMode = "test";
  showLoading();

  // Auto-collapse left pane on mobile when test starts
  if (settings.autoCollapse && window.innerWidth <= 768) {
    toggleLeftPane(true);
  }

  // Get form values
  const questionCount = parseInt(document.getElementById("questionCount").value);
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  const topic = document.getElementById("topicSelect").value;

  // Update header
  let headerText = "";
  if (topic === "all") {
    headerText = "Full Grammar Test";
  } else {
    const topicConfig = config.topics.find((t) => t.id === topic);
    headerText = `${topicConfig.name} Test`;
  }

  document.querySelector(".header-content h2").textContent = headerText;
  document.querySelector(".header-content p").textContent = `${questionCount} Questions | ${
    difficulty === "all" ? "All Difficulties" : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  } | Based on CBSE Pattern`;

  // Generate test
  currentTest = [];
  userAnswers = [];

  if (topic === "all") {
    // Mixed topics test
    const distribution = config.testConfigs.fullTest.distribution;
    const totalQuestions = Object.values(distribution).reduce((a, b) => a + b, 0);
    const scaleFactor = questionCount / totalQuestions;

    for (const [topicId, count] of Object.entries(distribution)) {
      const topicExists = config.topics.some((t) => t.id === topicId);
      if (!topicExists) {
        console.warn(`Topic ${topicId} not found in config, skipping`);
        continue;
      }

      const topicQuestions = await loadTopicQuestions(topicId);
      if (topicQuestions.length > 0) {
        const scaledCount = Math.max(1, Math.round(count * scaleFactor));
        const filteredQuestions = filterQuestionsByDifficulty(topicQuestions, difficulty);
        const selectedQuestions = getRandomQuestions(filteredQuestions, scaledCount);
        currentTest.push(...selectedQuestions);
      }
    }

    // Adjust to exact question count
    if (currentTest.length > questionCount) {
      currentTest = getRandomQuestions(currentTest, questionCount);
    } else if (currentTest.length < questionCount) {
      // Add more questions if we don't have enough
      const allQuestions = [];
      for (const topicId of Object.keys(distribution)) {
        const topicQuestions = await loadTopicQuestions(topicId);
        allQuestions.push(...topicQuestions);
      }
      const additionalQuestions = getRandomQuestions(
        filterQuestionsByDifficulty(allQuestions, difficulty),
        questionCount - currentTest.length
      );
      currentTest.push(...additionalQuestions);
    }
  } else {
    // Single topic test
    const topicQuestions = await loadTopicQuestions(topic);
    const filteredQuestions = filterQuestionsByDifficulty(topicQuestions, difficulty);
    currentTest = getRandomQuestions(filteredQuestions, Math.min(questionCount, filteredQuestions.length));
  }

  userAnswers = new Array(currentTest.length).fill(null);

  // Apply shuffling if enabled
  if (settings.shuffleQuestions) {
    shuffleArray(currentTest);
  }

  if (settings.shuffleOptions) {
    currentTest.forEach((q) => shuffleArray(q.options));
  }

  updatePrintButton();
  renderTest();
  hideLoading();
}

// Filter questions by difficulty
function filterQuestionsByDifficulty(questions, difficulty) {
  if (difficulty === "all") return questions;
  return questions.filter((q) => q.difficulty === difficulty);
}

// Load questions for a specific topic
async function loadTopicQuestions(topicId) {
  // Check if already loaded
  if (loadedTopics[topicId]) {
    return loadedTopics[topicId];
  }

  try {
    const topicConfig = config.topics.find((t) => t.id === topicId);
    if (!topicConfig) {
      console.error(`Topic ${topicId} not found in config`);
      return [];
    }

    const response = await fetch(`./data/${topicConfig.file}`);
    const questions = await response.json();

    // Cache the questions
    loadedTopics[topicId] = questions;

    return questions;
  } catch (error) {
    console.error(`Error loading topic ${topicId}:`, error);
    return [];
  }
}

// Show topic test
async function showTopicTest(topicId) {
  // Set the topic in the dropdown
  document.getElementById("topicSelect").value = topicId;

  // Generate test with current settings
  await generateCustomTest();
}

// Show all questions for a topic
async function showTopicQuestions(topicId) {
  currentMode = "view";
  showLoading();

  const topicConfig = config.topics.find((t) => t.id === topicId);
  if (!topicConfig) {
    hideLoading();
    return;
  }

  // Update header
  document.querySelector(".header-content h2").textContent = `All ${topicConfig.name} Questions`;
  document.querySelector(".header-content p").textContent = "Questions with Answers & Explanations";

  // Load all questions for this topic
  const topicQuestions = await loadTopicQuestions(topicId);

  updatePrintButton();
  renderQuestionsList(topicQuestions);
  hideLoading();
}

// Utility function to get random questions
function getRandomQuestions(questions, count) {
  if (questions.length <= count) return [...questions];

  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Utility function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Update settings from UI checkboxes
function updateSettingsFromUI() {
  settings.shuffleQuestions = document.getElementById("shuffleQuestions").checked;
  settings.shuffleOptions = document.getElementById("shuffleOptions").checked;
  settings.compactMode = document.getElementById("compactMode").checked;
  settings.showExplanations = document.getElementById("showExplanations").checked;
  settings.autoSubmit = document.getElementById("autoSubmit").checked;
  settings.autoCollapse = document.getElementById("autoCollapse").checked;

  saveSettings();
  applyCompactMode();
  setupAutoCollapse();
}

// Update print button visibility
function updatePrintButton() {
  printBtn.style.display = "block";
}

// Render test with all questions
function renderTest() {
  testContainer.innerHTML = `
          <div class="all-questions-container" id="allQuestions">
              ${currentTest
                .map(
                  (question, index) => `
                  <div class="question-card">
                      <div class="question-header">
                          <div class="question-number">Question ${index + 1}</div>
                          <div class="question-meta">
                              <span>${question.marks || 1} Mark${(question.marks || 1) > 1 ? "s" : ""}</span>
                              <span>${question.difficulty || "Medium"}</span>
                              <span>${question.question_type || "Multiple Choice"}</span>
                              ${question.topic ? `<span>Topic: ${getTopicName(question.topic)}</span>` : ""}
                          </div>
                      </div>
                      
                      <div class="question-text">${question.question}</div>
                      
                      <div class="options-container">
                          ${question.options
                            .map(
                              (option, optIndex) => `
                              <div class="option ${userAnswers[index] === option ? "selected" : ""}" 
                                   onclick="selectOption(${index}, ${optIndex})">
                                  ${String.fromCharCode(65 + optIndex)}. ${option}
                              </div>
                          `
                            )
                            .join("")}
                      </div>
                  </div>
              `
                )
                .join("")}
          </div>

          <div class="test-controls">
              <button class="btn btn-success" onclick="submitTest()">Submit Test</button>
          </div>
      `;
}

// Render questions list with answers
function renderQuestionsList(questions) {
  testContainer.innerHTML = `
          <div class="questions-list" id="questionsList">
              ${questions
                .map(
                  (q, index) => `
                  <div class="question-item">
                      <div class="item-meta">
                          <span><strong>Q${index + 1}</strong></span>
                          <span>Marks: ${q.marks || 1}</span>
                          <span>Type: ${q.question_type}</span>
                          <span>Difficulty: ${q.difficulty}</span>
                          <span>Year: ${q.year_asked || "N/A"}</span>
                      </div>
                      <div class="question-text">${q.question}</div>
                      <div class="options-container">
                          ${q.options
                            .map(
                              (option, optIndex) => `
                              <div class="option ${option === q.answer ? "selected" : ""}">
                                  ${String.fromCharCode(65 + optIndex)}. ${option}
                              </div>
                          `
                            )
                            .join("")}
                      </div>
                      ${
                        settings.showExplanations
                          ? `
                          <div class="explanation">
                              <strong>Answer:</strong> <span class="correct-answer">${q.answer}</span><br>
                              <strong>Explanation:</strong> ${q.explanation}
                          </div>
                      `
                          : ""
                      }
                  </div>
              `
                )
                .join("")}
          </div>
      `;
}

// Select an option for a question
function selectOption(questionIndex, optionIndex) {
  const option = currentTest[questionIndex].options[optionIndex];
  userAnswers[questionIndex] = option;

  // Update the visual selection
  const questionElement = document.querySelectorAll(".question-card")[questionIndex];
  const options = questionElement.querySelectorAll(".option");
  options.forEach((opt) => opt.classList.remove("selected"));
  options[optionIndex].classList.add("selected");

  // Auto submit if enabled
  if (settings.autoSubmit) {
    // Check if all questions are answered
    const allAnswered = userAnswers.every((answer) => answer !== null);
    if (allAnswered) {
      submitTest();
    }
  }
}

// Submit test and show results
function submitTest() {
  let score = 0;
  let totalMarks = 0;

  // Calculate score and total marks
  currentTest.forEach((question, index) => {
    const questionMarks = question.marks || 1;
    totalMarks += questionMarks;

    if (userAnswers[index] === question.answer) {
      score += questionMarks;
    }
  });

  // Check for perfect score
  const isPerfectScore = score === totalMarks;

  // Get the selected topic from the form
  const selectedTopic = document.getElementById("topicSelect").value;

  // Save to test history - include topic information
  const testRecord = {
    id: Date.now(),
    date: new Date().toISOString().split("T")[0],
    topic: selectedTopic,
    score: score,
    total: totalMarks,
    questionIds: currentTest.map((q) => q.id),
    questionTopics: currentTest.map((q) => q.topic), // Store topic for each question
    userAnswers: [...userAnswers],
    correctAnswers: currentTest.map((q) => q.answer),
  };

  testHistory.unshift(testRecord);
  // Keep only last 50 tests
  if (testHistory.length > 50) {
    testHistory = testHistory.slice(0, 50);
  }
  saveTestHistory();

  let resultsHTML = `
    <div class="question-card">
        <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">Test Results</h2>
        <p style="font-size: 24px; margin-bottom: 30px; text-align: center;">
            You scored <strong style="color: ${isPerfectScore ? '#10b981' : '#8b5cf6'}">${score}/${totalMarks}</strong>
            ${isPerfectScore ? '<br><span style="font-size: 18px; color: #10b981;">🎉 Perfect Score! 🎉</span>' : ''}
        </p>
  `;

  currentTest.forEach((question, index) => {
    const isCorrect = userAnswers[index] === question.answer;

    resultsHTML += `
      <div class="question-item" style="margin-bottom: 15px; padding: 12px; border: 2px solid ${
        isCorrect ? "#10b981" : "#ef4444"
      }; border-radius: 8px;">
          <div class="question-text"><strong>Q${index + 1}:</strong> ${question.question}</div>
          <div style="margin: 8px 0;">
              <div>Your answer: <span style="color: ${isCorrect ? "#10b981" : "#ef4444"}">${
      userAnswers[index] || "Not attempted"
    }</span></div>
              <div>Correct answer: <span style="color: #10b981">${question.answer}</span></div>
          </div>
          ${
            settings.showExplanations
              ? `
              <div class="explanation">
                  <strong>Explanation:</strong> ${question.explanation}
              </div>
          `
              : ""
          }
      </div>
  `;
  });

  resultsHTML += `
    <div style="text-align: center; margin-top: 25px;">
        <button class="btn btn-primary" onclick="generateCustomTest()">Take Another Test</button>
        <button class="btn history-btn" onclick="showTestHistory()" style="margin-left: 10px;">View History</button>
    </div>
  </div>`;

  testContainer.innerHTML = resultsHTML;

  // Trigger confetti if perfect score
  if (isPerfectScore) {
    setTimeout(() => {
      showPerfectScoreCelebration();
      createConfetti();
    }, 300);
  }
}

// Create confetti effect
function createConfetti() {
  const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#10b981', '#ec4899', '#06b6d4'];
  const confettiCount = 150;

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      confetti.style.animationDelay = '0s';
      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 5000);
    }, i * 30);
  }
}

// Show perfect score banner
function showPerfectScoreCelebration() {
  const banner = document.createElement('div');
  banner.className = 'perfect-score-banner';
  banner.innerHTML = `
    <h2>🌟 PERFECT SCORE! 🌟</h2>
    <p>Absolutely Brilliant!</p>
  `;
  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.animation = 'banner-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) reverse forwards';
    setTimeout(() => {
      banner.remove();
    }, 500);
  }, 3000);
}

// Print content
function printContent() {
  window.print();
}

// Close modal when clicking outside
window.onclick = function (event) {
  if (event.target === historyModal) {
    closeHistoryModal();
  }
};

// Add event listeners to settings checkboxes
document.getElementById("shuffleQuestions").addEventListener("change", updateSettingsFromUI);
document.getElementById("shuffleOptions").addEventListener("change", updateSettingsFromUI);
document.getElementById("compactMode").addEventListener("change", updateSettingsFromUI);
document.getElementById("showExplanations").addEventListener("change", updateSettingsFromUI);
document.getElementById("autoSubmit").addEventListener("change", updateSettingsFromUI);
document.getElementById("autoCollapse").addEventListener("change", updateSettingsFromUI);