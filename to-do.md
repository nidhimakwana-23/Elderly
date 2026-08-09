So far done:
- Added family switcher
- Added script to populate seed data for a user
- UI fixes:
    - Updated AIChat to not explicitly ask for patient id
    - Updated chart dashboard

 
To DO:
- Ai chat improvements
    - The current approach feeds data into the prompt, but it misses historic data (this year's data) and also the prompt would get unnecessarily large, think of a solution in which ai can determine and directly query from db
- Integrate other modules in FE
  - Doctor signup
  - Doctor appointment schedule
  - OTher remaining ones
- Add other modules
    - Caretaker module
- USe openAPi generator to generate schema
- THink of making scalable APIs