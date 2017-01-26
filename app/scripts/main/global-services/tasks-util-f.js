/**
 * @ngdoc factory
 * @name superProductivity.TasksUtil
 * @description
 * # TasksUtil
 * Factory in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .factory('TasksUtil', TasksUtil);

  /* @ngInject */
  function TasksUtil(SimpleToast, WORKLOG_DATE_STR_FORMAT) {

    function deleteNullValueTasks(tasksArray) {
      return tasksArray.filter(function (item) {
        return !!item;
      });
    }

    function checkDupes(tasksArray) {
      if (tasksArray) {
        deleteNullValueTasks(tasksArray);
        let valueArr = tasksArray.map(function (item) {
          return item && item.id;
        });
        let dupeIds = [];
        let hasDupe = valueArr.some(function (item, idx) {
          if (valueArr.indexOf(item) !== idx) {
            dupeIds.push(item);
          }
          return valueArr.indexOf(item) !== idx;
        });
        if (dupeIds.length) {
          let firstDupe = _.find(tasksArray, (task) => {
            return dupeIds.indexOf(task.id) > -1;
          });
          console.log(firstDupe);

          SimpleToast('!!! Dupes detected in data for the ids: ' + dupeIds.join(', ') + '. First task title is "' + firstDupe.title + '" !!!', 60000);
        }
        return hasDupe;
      }
    }

    function getTodayStr() {
      return moment().format(WORKLOG_DATE_STR_FORMAT);
    }

    function formatToWorklogDateStr(date) {
      if (date) {
        return moment(date).format(WORKLOG_DATE_STR_FORMAT);
      }
    }

    function convertDurationStringsToMomentForList(tasks) {
      if (tasks) {
        _.each(tasks, (task) => {
          convertDurationStringsToMoment(task);
          if (task.subTasks) {
            _.each(task.subTasks, convertDurationStringsToMoment);
          }
        });
      }
    }

    function convertDurationStringsToMoment(task) {
      if (task.timeSpent) {
        task.timeSpent = moment.duration(task.timeSpent);
      }
      if (task.timeEstimate) {
        task.timeEstimate = moment.duration(task.timeEstimate);
      }
      if (task.timeSpentOnDay) {
        _.forOwn(task.timeSpentOnDay, (val, strDate) => {
          task.timeSpentOnDay[strDate] = moment.duration(task.timeSpentOnDay[strDate]);
        });
      }
    }

    function calcTotalEstimate(tasks) {
      let totalEstimate;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalEstimate = moment.duration();
        _.each(tasks, (task) => {
          totalEstimate.add(task.timeEstimate);
        });
      }
      return totalEstimate;
    }

    function calcTotalTimeSpent(tasks) {
      let totalTimeSpent;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalTimeSpent = moment.duration();

        _.each(tasks, (task) => {
          if (task && task.timeSpent) {
            totalTimeSpent.add(task.timeSpent);
          }
        });
      }
      return totalTimeSpent;
    }

    function calcTotalTimeSpentOnDay(tasks, dayStr) {
      let totalTimeSpentOnDay;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalTimeSpentOnDay = moment.duration();

        _.each(tasks, (task) => {
          if (task && task.timeSpentOnDay && task.timeSpentOnDay[dayStr]) {
            totalTimeSpentOnDay.add(task.timeSpentOnDay[dayStr]);
          }
        });
      }
      return totalTimeSpentOnDay;
    }

    function mergeTotalTimeSpentOnDayFrom(tasks) {
      let totalTimeSpentOnDay = {};
      if (angular.isArray(tasks) && tasks.length > 0) {
        _.each(tasks, (task) => {
          if (task && task.timeSpentOnDay) {
            _.forOwn(task.timeSpentOnDay, (val, strDate) => {
              if (!totalTimeSpentOnDay[strDate]) {
                totalTimeSpentOnDay[strDate] = moment.duration();
              }
              totalTimeSpentOnDay[strDate].add(task.timeSpentOnDay[strDate]);
            });
          }
        });
      }
      return totalTimeSpentOnDay;
    }

    function calcTotalTimeSpentOnTask(task) {
      let totalTimeSpent = moment.duration();
      if (task) {
        _.forOwn(task.timeSpentOnDay, (val, strDate) => {
          if (task.timeSpentOnDay[strDate]) {
            totalTimeSpent.add(moment.duration(task.timeSpentOnDay[strDate]).asSeconds(), 's');
          }
        });

        if (totalTimeSpent.asMinutes() > 0) {
          return totalTimeSpent;
        } else {
          return undefined;
        }
      }
    }

    function calcRemainingTimeForTask(task) {
      let totalRemaining = moment.duration();

      if (task) {
        if (task.timeSpent && task.timeEstimate) {
          let timeSpentMilliseconds = moment.duration(task.timeSpent).asMilliseconds();
          let timeEstimateMilliseconds = moment.duration(task.timeEstimate).asMilliseconds();
          if (timeSpentMilliseconds < timeEstimateMilliseconds) {
            totalRemaining.add(moment.duration({ milliseconds: timeEstimateMilliseconds - timeSpentMilliseconds }));
          }
        } else if (task.timeEstimate) {
          totalRemaining.add(task.timeEstimate);
        }
      }

      return totalRemaining;
    }

    function calcRemainingTime(tasks) {
      let totalRemaining;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalRemaining = moment.duration();
        _.each(tasks, (task) => {
          if (task.subTasks && task.subTasks.length > 0) {
            _.each(task.subTasks, (subTask) => {
              totalRemaining.add(calcRemainingTimeForTask(subTask));
            });
          } else {
            totalRemaining.add(calcRemainingTimeForTask(task));
          }
        });
      }

      return totalRemaining;
    }

    function flattenTasks(tasks, checkFnParent, checkFnSub) {
      const flattenedTasks = [];
      _.each(tasks, (parentTask) => {

        if (parentTask) {
          if (parentTask.subTasks && parentTask.subTasks.length > 0) {
            _.each(parentTask.subTasks, (subTask) => {
              // execute check fn if there is one
              if (angular.isFunction(checkFnSub)) {
                if (checkFnSub(subTask)) {
                  flattenedTasks.push(subTask);
                }
              }
              // otherwise just add
              else {
                flattenedTasks.push(subTask);
              }
            });
          } else {
            // execute check fn if there is one
            if (angular.isFunction(checkFnParent)) {
              if (checkFnParent(parentTask)) {
                flattenedTasks.push(parentTask);
              }
            }
            // otherwise just add
            else {
              flattenedTasks.push(parentTask);
            }
          }
        }
      });

      return flattenedTasks;
    }

    function isWorkedOnToday(task) {
      let todayStr = getTodayStr();
      return task && task.timeSpentOnDay && task.timeSpentOnDay[todayStr];
    }

    function isJiraTask(task) {
      return task && task.originalKey;
    }

    function calcProgress(task) {
      let progress;
      // calc progress
      if (task && task.timeSpent && task.timeEstimate) {
        if (moment.duration().format && angular.isFunction(moment.duration().format)) {
          progress = parseInt(moment.duration(task.timeSpent)
              .format('ss') / moment.duration(task.timeEstimate).format('ss') * 100, 10);
        }
      }
      return progress;
    }

    // ACTUAL DEFINITION
    return {
      calcProgress: calcProgress,
      isJiraTask: isJiraTask,
      checkDupes: checkDupes,
      calcTotalEstimate: calcTotalEstimate,
      calcTotalTimeSpent: calcTotalTimeSpent,
      calcTotalTimeSpentOnDay: calcTotalTimeSpentOnDay,
      mergeTotalTimeSpentOnDayFrom: mergeTotalTimeSpentOnDayFrom,
      calcTotalTimeSpentOnTask: calcTotalTimeSpentOnTask,
      calcRemainingTime: calcRemainingTime,
      calcRemainingTimeForTask: calcRemainingTimeForTask,
      getTodayStr: getTodayStr,
      flattenTasks: flattenTasks,
      isWorkedOnToday: isWorkedOnToday,
      formatToWorklogDateStr: formatToWorklogDateStr,
      convertDurationStringsToMoment: convertDurationStringsToMoment,
      convertDurationStringsToMomentForList: convertDurationStringsToMomentForList
    };
  }
})();