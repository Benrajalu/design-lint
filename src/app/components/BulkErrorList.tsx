/* tslint:disable:jsx-no-multiline-js */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Menu from "./Menu";

function BulkErrorList(props) {
  // Reduce the size of our array of errors by removing nodes with no errors on them.
  const filteredErrorArray = props.errorArray.filter(
    item => item.errors.length >= 1
  );

  filteredErrorArray.forEach(item => {
    // Check each layer/node to see if an error that matches its layer id
    if (props.ignoredErrorArray.some(x => x.node.id === item.id)) {
      // When we know a matching error exists loop over all the ignored
      // errors until we find it.
      props.ignoredErrorArray.forEach(ignoredError => {
        if (ignoredError.node.id === item.id) {
          // Loop over every error this layer/node until we find the
          // error that should be ignored, then remove it.
          for (let i = 0; i < item.errors.length; i++) {
            if (item.errors[i].value === ignoredError.value) {
              item.errors.splice(i, 1);
              i--;
            }
          }
        }
      });
    }
  });

  const bulkErrorList = [];

  // Create the list we'll use to display all the errors in bulk.
  filteredErrorArray.forEach(item => {
    const nodeErrors = item.errors;

    nodeErrors.forEach(error => {
      // Check to see if another error with this same value exists.
      if (bulkErrorList.some(e => e.value === error.value)) {
        // Find the error of this type that already exists.
        const duplicateError = bulkErrorList.find(e => e.value === error.value);
        const nodesThatShareErrors = duplicateError.nodes;
        // Add the nodes id that share this error to the object
        // That way we can select them all at once.
        nodesThatShareErrors.push(error.node.id);
        duplicateError.nodes = nodesThatShareErrors;
        duplicateError.count = duplicateError.nodes.length;
      } else {
        // If this is the first instance of this type of error, add it to the list.
        error.nodes = [error.node.id];
        error.count = 0;
        bulkErrorList.push(error);
      }
    });
  });

  bulkErrorList.sort((a, b) => b.count - a.count);

  function handleIgnoreChange(error) {
    props.onIgnoredUpdate(error);
  }

  const variants = {
    initial: { opacity: 1, y: 10, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.8 }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 24 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 }
  };

  function handleSelectAll(error) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: error.nodes
        }
      },
      "*"
    );
  }

  function handleSelectAllHidden(error) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-hidden-layers",
          nodeArray: error.nodes
        }
      },
      "*"
    );
  }

  function handleSelect(error) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "fetch-layer-data",
          id: error.node.id
        }
      },
      "*"
    );
  }

  function handleIgnoreAll(error) {
    const errorsToBeIgnored = [];

    filteredErrorArray.forEach(node => {
      node.errors.forEach(item => {
        if (item.value === error.value) {
          if (item.type === error.type) {
            errorsToBeIgnored.push(item);
          }
        }
      });
    });

    if (errorsToBeIgnored.length) {
      props.onIgnoreAll(errorsToBeIgnored);
    }
  }

  const errorListItems = bulkErrorList.map((error, index) => (
    <motion.li
      positionTransition={true}
      className="error-list-item"
      key={error.node.id + index}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      <div className="flex-row">
        <span className="error-type">
          <img
            src={require("../assets/" + error.type.toLowerCase() + ".svg")}
          />
        </span>
        <span className="error-description">
          {error.nodes.length > 1 ? (
            <div className="error-description__message">
              {error.message} ({error.count})
            </div>
          ) : (
            <div className="error-description__message">{error.message}</div>
          )}
        </span>
        <span className="context-icon">
          {error.nodes.length > 1 ? (
            <Menu
              error={error}
              menuItems={[
                {
                  label: `Select All (${error.count})`,
                  event: handleSelectAll
                },
                {
                  label: `Select All hidden from (${error.count}) errors`,
                  event: handleSelectAllHidden
                },
                {
                  label: "Ignore",
                  event: handleIgnoreChange
                },
                {
                  label: "Ignore All",
                  event: handleIgnoreAll
                }
              ]}
            />
          ) : (
            <Menu
              error={error}
              menuItems={[
                {
                  label: `Select`,
                  event: handleSelect
                },
                {
                  label: "Ignore",
                  event: handleIgnoreChange
                }
              ]}
            />
          )}
        </span>
      </div>

      {error.value ? (
        <div className="current-value">Current value: {error.value}</div>
      ) : null}
      {error.rule && (
        <div className="error-rule__message">
          <img className="rule__arrow" src={require("../assets/caret.svg")} />
          {error.rule}
        </div>
      )}
    </motion.li>
  ));

  return (
    <motion.div
      className="bulk-errors-list"
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
    >
      <AnimatePresence>
        <div className="panel-body panel-body-errors" key="bulk-errors">
          {bulkErrorList.length ? (
            <ul className="errors-list">{errorListItems}</ul>
          ) : (
            <motion.div
              variants={variants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="success-message"
              key="single-error"
            >
              <div className="success-shape">
                <img
                  className="success-icon"
                  src={require("../assets/smile.svg")}
                />
              </div>
              All errors fixed in the selection
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
}

export default BulkErrorList;
