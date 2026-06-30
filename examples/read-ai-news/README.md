# Exercise
Complete the practice exercise by searching for AI news and summarizing the findings using all core components and middleware, following this [guideline](https://docs.langchain.com/oss/javascript/langchain/agents).

## Result
```bash
$ pnpm tsx read-ai-news

[Tool] Searching AI news for: "AI"...

[Tool] Found 5 articles for "AI"


=== Structured Output ===

{
  "overview": "This week, the AI news landscape features significant developments including California's pioneering initiative to monitor AI's workforce impacts, discussions on AI stock investments, and efforts to support displaced workers due to AI adoption. Additionally, there are debates on the effectiveness of AI technologies and insights into leveraging proprietary intelligence for business success.",
  "articles": [
    {
      "title": "Artificial Intelligence or Artificial Stupidity?",
      "source": "Chromatography Online",
      "url": "https://news.google.com/rss/articles/CBMilAFBVV95cUxQYW00eXFPWXJIUjFsd094VEJXNF8weGNFUUllQzB0amt4UjU3Q29CeDduZ1h1VjVwSklLX2xCWm0tTWszbXdTWTI5ZC1ZR3NETHNvZFJRakZaRkFFNTUwdlRYUVJzR3NpSDIyenFOWEY1QU8wQWlteUxyNkNPZFJxb0w4UmlwcnRMMlM1a3NnNG9FOVpK?oc=5",
      "summary": "This article explores the ongoing debate about the effectiveness of artificial intelligence, questioning whether it truly enhances capabilities or leads to 'artificial stupidity.' It highlights various perspectives on AI's role in modern technology.",
      "importance": "medium"
    },
    {
      "title": "2 Beaten-Down Artificial Intelligence (AI) Stocks for Contrarian Investors to Consider Buying",
      "source": "The Motley Fool",
      "url": "https://news.google.com/rss/articles/CBMimAFBVV95cUxQX3RYb3E1SEdtZW5Eb200eHRWeXZOUW9yckZseWFYTlJad1V3Z3NOVF84eWREeWlMblZ1M3Y1M0Y2VFhXd2dKamllT0FTT0tfWjUtOXB0bHl5cVRUXzNVUFRIdm5NVHhVaVl6ZWtzY3Q1SFVuNWlueXZfaUhxaWxpWFF4WTR3WWlNdkUxQlVzWmtkc2UtaXhVNw?oc=5",
      "summary": "The article identifies two AI stocks that have seen significant declines, suggesting they may present buying opportunities for contrarian investors. It provides insights into market trends and potential recovery.",
      "importance": "medium"
    },
    {
      "title": "California becomes the first state to launch a tool to monitor and track artificial intelligence’s impacts on the workforce",
      "source": "California State Portal | CA.gov",
      "url": "https://news.google.com/rss/articles/CBMi7gFBVV95cUxObG9LTE4weVhnNzlSck5JZ0VHc1RUMnd3TUNXdmloMkF5bndLUHpaMUNKd1JseG5oOVVJWjRuZ3NiQXFrQlo5Tjd6aVFSckczOEd5R3R4NTJmSnVvcmxfUFN0LWlBeV9NczFVaUt0X1RfMjVrT29pMUpxNFh5c3NFVWNScVFuQndERFo5bnBOOW51RW5zTWd0bmVudE1NUXJaSzNURk40bWl3aWpJYVlxT3JwX3J3LVpFWWpOT25Qei1JVjFnS2c2amNTVUVOY2VmN3o5UDVEcGJycEJCNDkwZHE0eFJSZ1BJVXRqQUt3?oc=5",
      "summary": "California has launched a groundbreaking tool aimed at monitoring the impacts of AI on the workforce, becoming the first state to do so. This initiative seeks to address the challenges posed by AI advancements in employment.",
      "importance": "high"
    },
    {
      "title": "Proprietary Intelligence: How to Win with AI",
      "source": "Bain & Company",
      "url": "https://news.google.com/rss/articles/CBMif0FVX3lxTFBWNG9DRVl5TjNadVhUUTB5ZHZneTg3TC11eEtYbTA2aE1Qdkl5NUNNTGZxelVDN3ZSbEFOMDZXb2xRaUd2eS02Nm42MDNWb205dHJydHhUclJBZm1fRUkxM3pjMGNzcnFCRHpxeWtrWF9nZDF0aGU1ODlCX1dhSDg?oc=5",
      "summary": "This article discusses strategies for leveraging proprietary intelligence in AI to gain competitive advantages in business. It emphasizes the importance of unique data and insights in maximizing AI's potential.",
      "importance": "medium"
    },
    {
      "title": "Nonprofit aims to help displaced workers as businesses adopt artificial intelligence",
      "source": "PBS",
      "url": "https://news.google.com/rss/articles/CBMiugFBVV95cUxNMm5vQ0xYX3QzLUVaYkhWOHU4QkV6eEFZTzZVRkNjX2x5RWU3UUlPdFVLbm9VQ3AwZXRpUENfN0dxcUdLOVBTR1U5blZhd2JHTFhsZF9IaVpsZ042eFdEUXVDaUFrdTZlZHo3emhibGFpYS1ULWd3S0ZYZ3BwOXY1WVJDLUc2ZlRtaGxmcW5naGduUXIzbm4wZmN1cWlfV3Y2TVNRTGFOelQtc0R6TjRVaXpYWjFUQWdqRVE?oc=5",
      "summary": "A nonprofit organization is stepping in to assist workers displaced by the rapid adoption of AI technologies in businesses. The initiative aims to provide support and resources to those affected by job losses.",
      "importance": "high"
    }
  ],
  "topStory": "California becomes the first state to launch a tool to monitor and track artificial intelligence’s impacts on the workforce"
}
```